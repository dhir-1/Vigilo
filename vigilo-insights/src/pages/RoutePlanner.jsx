import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Navigation,
  Clock,
  Shield,
  LocateFixed,
  Loader2,
  AlertTriangle,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { PlaceSearchInput, reverseGeocode, searchPlaces } from "@/components/common/PlaceSearchInput";
import { Sidebar } from "@/components/common/Sidebar";
import { Navbar } from "@/components/common/Navbar";
import { SOSButton } from "@/components/common/SOSButton";
import { MapView } from "@/components/map/MapView";
import { MapMarker } from "@/components/map/MapMarker";
import { MapPolyline } from "@/components/map/MapPolyline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { navigationAPI } from "@/lib/api";
import { SURAT_CENTER } from "@/lib/constants";
import { useGlobalLocation } from "@/context/LocationContext";

const startMarkerHtml = `<div style="width:32px;height:32px;background:#22c55e;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="8"/></svg>
</div>`;

const endMarkerHtml = `<div style="width:32px;height:32px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="12,2 22,22 2,22"/></svg>
</div>`;

export default function RoutePlanner() {
  const { coords } = useGlobalLocation();
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [startLabel, setStartLabel] = useState("");
  const [endLabel, setEndLabel] = useState("");
  const [travelTime, setTravelTime] = useState("now");
  const [scheduleTime, setScheduleTime] = useState("");
  const [routeData, setRouteData] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState("safest");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [settingPoint, setSettingPoint] = useState(null);
  const [autoDetect, setAutoDetect] = useState(() => {
    try {
      const stored = localStorage.getItem("vigilo_auto_detect");
      return stored === null ? true : JSON.parse(stored);
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const syncPreferences = () => {
      try {
        const stored = localStorage.getItem("vigilo_auto_detect");
        setAutoDetect(stored === null ? true : JSON.parse(stored));
      } catch {
        setAutoDetect(true);
      }
    };

    window.addEventListener("settings-changed", syncPreferences);
    return () => window.removeEventListener("settings-changed", syncPreferences);
  }, []);

  const handleStartSelect = (lat, lng, name) => {
    if (lat !== null) {
      setStartCoords({ lat, lng });
      setStartLabel(name);
      return;
    }

    setStartCoords(null);
    setStartLabel("");
  };

  const handleEndSelect = (lat, lng, name) => {
    if (lat !== null) {
      setEndCoords({ lat, lng });
      setEndLabel(name);
      return;
    }

    setEndCoords(null);
    setEndLabel("");
  };

  const handleUseMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const name = await reverseGeocode(lat, lng);
        setStartCoords({ lat, lng });
        setStartLabel(name);
      },
      () => {
        setStartCoords({ lat: SURAT_CENTER[0], lng: SURAT_CENTER[1] });
        setStartLabel("Surat Center (default)");
      }
    );
  };

  const handleMapClick = useCallback(async (lat, lng) => {
    if (!settingPoint) return;

    const name = await reverseGeocode(lat, lng);
    if (settingPoint === "start") {
      setStartCoords({ lat, lng });
      setStartLabel(name);
    } else if (settingPoint === "end") {
      setEndCoords({ lat, lng });
      setEndLabel(name);
    }

    setSettingPoint(null);
  }, [settingPoint]);

  const handleCalculate = async () => {
    let resolvedStart = startCoords;
    let resolvedEnd = endCoords;

    if (!resolvedStart && startLabel) {
      const results = await searchPlaces(startLabel);
      if (results?.length) {
        const lat = parseFloat(results[0].lat);
        const lng = parseFloat(results[0].lon);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          resolvedStart = { lat, lng };
          setStartCoords(resolvedStart);
          const name = results[0].display_name?.split(",").slice(0, 3).join(",");
          if (name) setStartLabel(name);
        }
      }
    }

    if (!resolvedEnd && endLabel) {
      const results = await searchPlaces(endLabel);
      if (results?.length) {
        const lat = parseFloat(results[0].lat);
        const lng = parseFloat(results[0].lon);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          resolvedEnd = { lat, lng };
          setEndCoords(resolvedEnd);
          const name = results[0].display_name?.split(",").slice(0, 3).join(",");
          if (name) setEndLabel(name);
        }
      }
    }

    if (!resolvedStart || !resolvedEnd) {
      setError("Please select both a start location and a destination");
      return;
    }

    setIsLoading(true);
    setError("");
    setRouteData(null);

    try {
      const data = await navigationAPI.getRoute(
        resolvedStart.lat,
        resolvedStart.lng,
        resolvedEnd.lat,
        resolvedEnd.lng,
        travelTime === "schedule" ? scheduleTime : undefined
      );
      setRouteData(data);
      setSelectedRoute("safest");
    } catch (err) {
      setError(err.message || "Failed to calculate routes. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const normalizeRoutePath = useCallback((path) => {
    if (!Array.isArray(path)) return [];

    return path
      .map((pt) => {
        if (Array.isArray(pt) && pt.length >= 2) {
          const a = Number(pt[0]);
          const b = Number(pt[1]);
          if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

          if (Math.abs(a) > 90 && Math.abs(b) <= 90) {
            return [b, a];
          }

          return [a, b];
        }

        if (pt && typeof pt === "object") {
          const lat = Number(pt.lat ?? pt.latitude);
          const lng = Number(pt.lng ?? pt.lon ?? pt.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          return [lat, lng];
        }

        return null;
      })
      .filter(Boolean);
  }, []);

  const safestPath = useMemo(() => {
    return routeData?.routes?.safest ? normalizeRoutePath(routeData.routes.safest) : [];
  }, [routeData, normalizeRoutePath]);

  const routes = useMemo(() => {
    if (!routeData || !routeData.stats) return [];

    return [
      {
        key: "safest",
        icon: Shield,
        label: "Safest Route",
        badge: "Recommended",
        color: "#22c55e",
        distance: `${routeData.stats.safest.distance_km?.toFixed(1)} km`,
        time: `${Math.round(routeData.stats.safest.duration_min)} min`,
        riskScore: routeData.stats.safest.risk_score,
        safetyScore: routeData.stats.safest.safety_score,
        path: safestPath,
      },
    ];
  }, [routeData, safestPath]);

  const mapCenter = (safestPath && safestPath.length > 0)
    ? safestPath[Math.floor(safestPath.length / 2)] || SURAT_CENTER
    : startCoords
      ? [startCoords.lat, startCoords.lng]
      : autoDetect && coords?.lat && coords?.lng
        ? [coords.lat, coords.lng]
        : SURAT_CENTER;

  const mapZoom = routeData ? 14 : 13;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <Navbar title="Route Planner" subtitle="Find the safest path to your destination" />

        <div className="px-4 sm:px-6 lg:px-10 pb-16 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-4 sm:p-6 shadow-soft border-ceramic space-y-5"
          >
            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20 flex items-center gap-2">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-end">
              <div className="space-y-2">
                <PlaceSearchInput
                  label="Start Location"
                  icon={MapPin}
                  iconColor="text-green-500"
                  placeholder="Search for a place or address..."
                  value={startLabel}
                  onQueryChange={setStartLabel}
                  onSelect={handleStartSelect}
                  disabled={isLoading}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUseMyLocation}
                    className="rounded-lg gap-1.5 text-xs h-8"
                    disabled={isLoading}
                  >
                    <LocateFixed size={12} />
                    Use my location
                  </Button>
                  <Button
                    variant={settingPoint === "start" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSettingPoint(settingPoint === "start" ? null : "start")}
                    className="rounded-lg gap-1.5 text-xs h-8"
                    disabled={isLoading}
                  >
                    <MapPin size={12} />
                    {settingPoint === "start" ? "Click map now..." : "Pick on map"}
                  </Button>
                </div>
              </div>

              <div className="hidden lg:flex items-center justify-center pb-10">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <ArrowRight size={18} className="text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <PlaceSearchInput
                  label="Destination"
                  icon={MapPin}
                  iconColor="text-red-500"
                  placeholder="Search for a place or address..."
                  value={endLabel}
                  onQueryChange={setEndLabel}
                  onSelect={handleEndSelect}
                  disabled={isLoading}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={settingPoint === "end" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSettingPoint(settingPoint === "end" ? null : "end")}
                    className="rounded-lg gap-1.5 text-xs h-8"
                    disabled={isLoading}
                  >
                    <MapPin size={12} />
                    {settingPoint === "end" ? "Click map now..." : "Pick on map"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <Tabs value={travelTime} onValueChange={setTravelTime} className="w-auto">
                  <TabsList className="rounded-xl w-full sm:w-auto">
                    <TabsTrigger value="now" className="rounded-lg gap-1 flex-1 sm:flex-none">
                      <Clock size={14} /> Now
                    </TabsTrigger>
                    <TabsTrigger value="schedule" className="rounded-lg gap-1 flex-1 sm:flex-none">
                      <Clock size={14} /> Schedule
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                {travelTime === "schedule" && (
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full sm:w-32 rounded-xl"
                  />
                )}
              </div>

              <Button onClick={handleCalculate} className="rounded-xl px-8 h-11 w-full sm:w-auto" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Calculating routes...
                  </>
                ) : (
                  <>
                    <Navigation size={16} />
                    Calculate Routes
                  </>
                )}
              </Button>
            </div>

            {isLoading && (
              <p className="text-xs text-muted-foreground text-center animate-pulse">
                Analyzing crime data along the safest path...
              </p>
            )}

            {settingPoint && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-primary/10 text-primary text-sm border border-primary/20 text-center"
              >
                Click anywhere on the map below to set your <strong>{settingPoint === "start" ? "starting point" : "destination"}</strong>.
              </motion.div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-3xl overflow-hidden shadow-soft border-ceramic bg-card ${settingPoint ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
          >
            <div className="h-[52vh] min-h-[340px] max-h-[500px] sm:min-h-[420px] md:h-[450px]">
              <MapView center={mapCenter} zoom={mapZoom} onMapClick={handleMapClick}>
                {startCoords && (
                  <MapMarker position={[startCoords.lat, startCoords.lng]} html={startMarkerHtml} />
                )}

                {endCoords && (
                  <MapMarker position={[endCoords.lat, endCoords.lng]} html={endMarkerHtml} />
                )}

                {routes.map((route) => (
                  <MapPolyline
                    key={route.key}
                    id={route.key}
                    positions={route.path}
                    color={route.color}
                    weight={selectedRoute === route.key ? 6 : 3}
                    opacity={selectedRoute === route.key ? 1 : 0.3}
                    dashArray={selectedRoute === route.key ? undefined : "8 6"}
                    onClick={() => setSelectedRoute(route.key)}
                  />
                ))}
              </MapView>
            </div>
          </motion.div>

          {routeData && (
            <div className="space-y-4">
              {routes.map((route) => {
                const Icon = route.icon;

                return (
                  <motion.div
                    key={route.key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-2xl p-4 sm:p-6 shadow-soft border-2 border-primary flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6"
                  >
                    <div className="flex items-center gap-4 min-w-0 w-full lg:w-auto">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: route.color + "20", color: route.color }}
                      >
                        <Icon size={28} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xl font-extrabold text-foreground">{route.label}</p>
                        {route.badge && (
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white mt-1 inline-block" style={{ backgroundColor: route.color }}>
                            {route.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 w-full gap-3 lg:flex lg:items-center lg:justify-around lg:flex-1 py-4 lg:py-0 border-y border-border/50 lg:border-0">
                      <div className="text-center">
                        <p className="text-2xl font-bold tabular-nums text-foreground">{route.distance}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">Distance</p>
                      </div>
                      <div className="w-px h-10 bg-border/50 hidden lg:block" />
                      <div className="text-center">
                        <p className="text-2xl font-bold tabular-nums text-foreground">{route.time}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">Time</p>
                      </div>
                      <div className="w-px h-10 bg-border/50 hidden lg:block" />
                      <div className="text-center">
                        <p
                          className="text-3xl font-extrabold tabular-nums drop-shadow-sm"
                          style={{ color: route.safetyScore >= 70 ? "#22c55e" : route.safetyScore >= 40 ? "#eab308" : "#ef4444" }}
                        >
                          {route.safetyScore}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">Safety</p>
                      </div>
                    </div>

                    <div className="w-full lg:w-auto shrink-0 lg:ml-4">
                      <Button
                        size="lg"
                        className="w-full lg:w-auto rounded-xl gap-2 font-bold px-8"
                        style={{ backgroundColor: route.color, color: "white" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = `https://www.google.com/maps/dir/?api=1&origin=${startCoords.lat},${startCoords.lng}&destination=${endCoords.lat},${endCoords.lng}&travelmode=driving`;
                          window.open(url, "_blank");
                        }}
                      >
                        <ExternalLink size={18} />
                        Open in Google Maps
                      </Button>
                    </div>
                  </motion.div>
                );
              })}

              {routeData.summary?.warnings?.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card/50 rounded-2xl p-5 shadow-sm border border-border/50 space-y-2"
                >
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <AlertTriangle size={16} className="text-warning" />
                    Route Warnings
                  </h3>
                  {routeData.summary.warnings.map((w, i) => (
                    <p key={i} className="text-sm text-muted-foreground">
                      {w.message}
                    </p>
                  ))}
                </motion.div>
              )}
            </div>
          )}
        </div>
      </main>
      <SOSButton />
    </div>
  );
}
