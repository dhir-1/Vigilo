import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { reverseGeocode } from "@/components/common/PlaceSearchInput";
import { useAuth } from "@/context/AuthContext";
import { reportsAPI, savedLocationsAPI } from "@/lib/api";
import { SURAT_CENTER } from "@/lib/constants";

export const LocationContext = createContext();

export function useGlobalLocation() {
  return useContext(LocationContext);
}

export function LocationProvider({ children }) {
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const { isAuthenticated, user } = useAuth();
  const savedPlaceOrder = { Home: 0, Work: 1, College: 2, Hostel: 3 };
  const [coords, setCoords] = useState(null);
  const [address, setAddress] = useState("Locating...");
  const [alerts, setAlerts] = useState([]);
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [isLoadingSavedPlaces, setIsLoadingSavedPlaces] = useState(false);
  const [settingsTick, setSettingsTick] = useState(0);
  const wsRef = useRef(null);
  const coordsRef = useRef(null); // Ref to avoid stale closures in WS handler
  const savedPlacesRef = useRef([]);
  const geocodeRef = useRef({ lat: null, lng: null });
  const reconnectRef = useRef(null);
  const alertsKeyRef = useRef(null);
  const MAX_ALERTS = 50;

  const getNotifEnabled = () => {
    if (typeof user?.notif_alerts === "boolean") return user.notif_alerts;
    try {
      const stored = localStorage.getItem("vigilo_notif_alerts");
      return stored === null ? true : JSON.parse(stored);
    } catch {
      return true;
    }
  };

  const normalizeSavedPlaces = (places) =>
    (Array.isArray(places) ? places : [])
      .map((place) => ({
        ...place,
        label: place.label || "Saved place",
        lat: place.lat ?? place.latitude,
        lng: place.lng ?? place.longitude,
      }))
      .filter((place) => place.id && place.lat !== undefined && place.lng !== undefined)
      .sort((a, b) => (savedPlaceOrder[a.label] ?? 999) - (savedPlaceOrder[b.label] ?? 999));

  const buildAlertFromReport = (report, options = {}) => {
    const distanceKm = typeof options.distanceKm === "number" ? options.distanceKm : null;
    const matchedPlaceLabel = options.matchedPlaceLabel || report.matched_place_label || null;
    const id = String(report.id ?? report.report_id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const title = matchedPlaceLabel
      ? `Safety Alert: ${report.crime_type || "Incident"} reported near ${matchedPlaceLabel}`
      : `Safety Alert: ${report.crime_type || "Incident"} reported ${distanceKm !== null ? `${distanceKm.toFixed(1)} km away` : "nearby"}`;

    return {
      id,
      title,
      areaName: report.area_name || "Unknown area",
      severity: (report.severity || "medium").toLowerCase(),
      crimeType: report.crime_type,
      lat: report.latitude,
      lng: report.longitude,
      time: options.timeLabel || "Just now",
      read: false,
      type: "danger",
      distanceKm,
      matchedPlaceLabel,
      reportId: report.report_id || report.id,
    };
  };

  // Keep coordsRef in sync with coords state
  useEffect(() => {
    coordsRef.current = coords;
  }, [coords]);

  useEffect(() => {
    savedPlacesRef.current = savedPlaces;
  }, [savedPlaces]);

  const fetchedRecentRef = useRef(false); // Track if we fetched missed alerts

  const loadSavedPlaces = async () => {
    if (!isAuthenticated) {
      setSavedPlaces([]);
      return [];
    }

    setIsLoadingSavedPlaces(true);
    try {
      const data = await savedLocationsAPI.list();
      const normalized = normalizeSavedPlaces(data);
      setSavedPlaces(normalized);
      return normalized;
    } catch (err) {
      console.error("[Location] Failed to load saved places:", err);
      setSavedPlaces([]);
      return [];
    } finally {
      setIsLoadingSavedPlaces(false);
    }
  };

  const addSavedPlace = async (placeData) => {
    const saved = await savedLocationsAPI.upsert(placeData);
    const normalizedSaved = normalizeSavedPlaces([saved])[0];
    setSavedPlaces((prev) =>
      normalizeSavedPlaces([
        ...prev.filter((place) => place.label !== normalizedSaved.label),
        normalizedSaved,
      ])
    );
    return normalizedSaved;
  };

  const removeSavedPlace = async (id) => {
    await savedLocationsAPI.remove(id);
    setSavedPlaces((prev) => prev.filter((place) => place.id !== id));
  };

  // Listen for settings changes (localStorage-backed)
  useEffect(() => {
    const handler = () => setSettingsTick((t) => t + 1);
    window.addEventListener("settings-changed", handler);
    return () => window.removeEventListener("settings-changed", handler);
  }, []);

  // Restore alerts from storage per-user (to avoid duplicates on refresh)
  useEffect(() => {
    if (!isAuthenticated) {
      alertsKeyRef.current = null;
      return;
    }

    const key = user?.id ? `vigilo_alerts_cache_${user.id}` : "vigilo_alerts_cache";
    alertsKeyRef.current = key;
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        const seen = new Set();
        const unique = [];
        for (const item of parsed) {
          if (!item) continue;
          const id = String(item.id ?? "");
          if (!id || seen.has(id)) continue;
          seen.add(id);
          unique.push({ ...item, id });
        }
        setAlerts(unique.slice(0, MAX_ALERTS));
      }
    } catch {
      // ignore parse errors
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isAuthenticated) {
      setSavedPlaces([]);
      return;
    }
    loadSavedPlaces();
  }, [isAuthenticated, user?.id]);

  // Persist alerts to storage (keeps read state across refresh)
  useEffect(() => {
    if (!isAuthenticated || !alertsKeyRef.current) return;
    const trimmed = Array.isArray(alerts) ? alerts.slice(0, MAX_ALERTS) : [];
    try {
      localStorage.setItem(alertsKeyRef.current, JSON.stringify(trimmed));
    } catch {
      // ignore quota errors
    }
  }, [alerts, isAuthenticated]);

  // Clear alerts and reset fetch state when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setAlerts([]);
      setSavedPlaces([]);
      fetchedRecentRef.current = false;
      try {
        const key = alertsKeyRef.current;
        if (key) localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }
  }, [isAuthenticated, settingsTick]);

  // 1. Get user location (with fallback to Surat center)
  useEffect(() => {
    if (!isAuthenticated) {
      setCoords(null);
      setAddress("Locating...");
      return;
    }

    const privacyAllowed = (() => {
      try {
        const stored = localStorage.getItem("vigilo_privacy_loc");
        return stored === null ? true : JSON.parse(stored);
      } catch {
        return true;
      }
    })();

    if (!privacyAllowed) {
      setAddress("Location sharing disabled");
      setCoords(null);
      return;
    }

    if (!navigator.geolocation) {
      setAddress("GPS not supported");
      setCoords({ lat: SURAT_CENTER[0], lng: SURAT_CENTER[1], isFallback: true });
      return;
    }

    let cancelled = false;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (cancelled) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng, isFallback: false });
      },
      () => {
        if (cancelled) return;
        setAddress("Location unavailable");
        setCoords({ lat: SURAT_CENTER[0], lng: SURAT_CENTER[1], isFallback: true });
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );

    return () => {
      cancelled = true;
      if (watchId !== null && watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isAuthenticated]);

  // 2. Reverse geocode for display address
  useEffect(() => {
    if (!coords?.lat || !coords?.lng) return;

    const roundedLat = Number(coords.lat.toFixed(4));
    const roundedLng = Number(coords.lng.toFixed(4));
    const last = geocodeRef.current;
    if (last.lat === roundedLat && last.lng === roundedLng) return;
    geocodeRef.current = { lat: roundedLat, lng: roundedLng };

    reverseGeocode(coords.lat, coords.lng)
      .then((name) => {
        if (name) setAddress(name);
      })
      .catch(() => {
        setAddress(`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
      });
  }, [coords?.lat, coords?.lng]);

  // 3. Connect to WebSocket for live proximity alerts
  useEffect(() => {
    if (!isAuthenticated) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      return;
    }

    const notifEnabled = getNotifEnabled();

    if (!notifEnabled) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const apiUrl = new URL(API_BASE);
    const wsProtocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${apiUrl.host}/api/ws/alerts`;
    let shouldReconnect = true;

    const connect = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WS] Connected to proximity alerts");
        const current = coordsRef.current;
        if (current?.lat && current?.lng) {
          ws.send(JSON.stringify({ action: "update_location", lat: current.lat, lng: current.lng }));
        }
        ws.send(
          JSON.stringify({
            action: "set_saved_places",
            saved_places: savedPlacesRef.current.map((place) => ({
              label: place.label,
              lat: place.lat,
              lng: place.lng,
            })),
          })
        );
      };

      ws.onmessage = (event) => {
        let payload;
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }

        if (payload?.type !== "proximity_alert") return;
        const report = payload?.data || {};
        const nextAlert = buildAlertFromReport(report, {
          distanceKm: typeof payload.distance === "number" ? payload.distance : null,
          matchedPlaceLabel: payload.matched_place_label || null,
          timeLabel: "Just now",
        });

        setAlerts((prev) => {
          const existingIds = new Set(prev.map((a) => String(a.id)));
          if (existingIds.has(String(nextAlert.id))) return prev;
          return [nextAlert, ...prev];
        });
      };

      ws.onclose = () => {
        if (!shouldReconnect) return;
        reconnectRef.current = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      shouldReconnect = false;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, user?.notif_alerts, settingsTick]);

  // 4. Fetch recent missed alerts when coordinates are established & user is logged in
  useEffect(() => {
    if (!isAuthenticated || fetchedRecentRef.current || !getNotifEnabled()) return;
    if (!coords?.lat && savedPlaces.length === 0) return;

    fetchedRecentRef.current = true;

    const fetchRecentAlerts = async () => {
      try {
        const requests = [];

        if (coords?.lat && coords?.lng) {
          requests.push(
            fetch(`${API_BASE}/api/reports/recent-nearby?lat=${coords.lat}&lng=${coords.lng}&radius_km=5.0`).then((res) => res.json())
          );
        } else {
          requests.push(Promise.resolve([]));
        }

        requests.push(savedPlaces.length > 0 ? reportsAPI.recentSavedLocations() : Promise.resolve([]));

        const [nearbyReports, savedPlaceReports] = await Promise.all(requests);
        const missedAlerts = [
          ...(Array.isArray(nearbyReports)
            ? nearbyReports.map((report) =>
                buildAlertFromReport(report, {
                  timeLabel: "Recently verified",
                })
              )
            : []),
          ...(Array.isArray(savedPlaceReports)
            ? savedPlaceReports.map((report) =>
                buildAlertFromReport(report, {
                  matchedPlaceLabel: report.matched_place_label || null,
                  distanceKm: typeof report.matched_place_distance === "number" ? report.matched_place_distance : null,
                  timeLabel: "Recently verified",
                })
              )
            : []),
        ];

        setAlerts((prev) => {
          const merged = [...prev];
          const existingIds = new Set(prev.map((alert) => String(alert.id)));

          for (const alert of missedAlerts) {
            if (existingIds.has(String(alert.id))) continue;
            existingIds.add(String(alert.id));
            merged.unshift(alert);
          }

          return merged.slice(0, MAX_ALERTS);
        });
      } catch (err) {
        console.error("[Location] Failed to fetch recent reports:", err);
        fetchedRecentRef.current = false;
      }
    };

    fetchRecentAlerts();
  }, [API_BASE, coords?.lat, coords?.lng, isAuthenticated, savedPlaces, user?.notif_alerts, settingsTick]);

  // 5. Send location to WS whenever it changes
  useEffect(() => {
    if (coords && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: "update_location",
        lat: coords.lat,
        lng: coords.lng
      }));
      console.log(`[WS] Sent location update: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
    }
  }, [coords?.lat, coords?.lng]);

  useEffect(() => {
    fetchedRecentRef.current = false;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          action: "set_saved_places",
          saved_places: savedPlaces.map((place) => ({
            label: place.label,
            lat: place.lat,
            lng: place.lng,
          })),
        })
      );
    }
  }, [savedPlaces]);

  return (
    <LocationContext.Provider
      value={{
        coords,
        address,
        alerts,
        setAlerts,
        savedPlaces,
        isLoadingSavedPlaces,
        addSavedPlace,
        removeSavedPlace,
        refreshSavedPlaces: loadSavedPlaces,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}
