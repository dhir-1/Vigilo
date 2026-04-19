import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { SURAT_CENTER, DEFAULT_ZOOM } from "@/lib/constants";
import { MapLibreContext } from "@/components/map/MapContext";

const CARTO_DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const CARTO_LIGHT_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

const getIsDarkMode = () => {
  try {
    const stored = localStorage.getItem("vigilo_dark_mode");
    if (stored !== null) return JSON.parse(stored);
  } catch {}
  return document.documentElement.classList.contains("dark");
};

const toLngLat = (center) => {
  if (!center || center.length < 2) return [SURAT_CENTER[1], SURAT_CENTER[0]];
  return [center[1], center[0]];
};

export function MapView({ children, center, zoom, className = "", style = {}, onMapClick }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [styleReady, setStyleReady] = useState(false);
  const lastViewRef = useRef({ center: null, zoom: null });

  // Track dark mode for map style
  const [isDark, setIsDark] = useState(getIsDarkMode);

  // Listen for theme changes
  useEffect(() => {
    const handleSettingsChange = () => {
      setIsDark(getIsDarkMode());
    };
    window.addEventListener("settings-changed", handleSettingsChange);

    // Also observe class changes on documentElement for dark mode toggle
    const observer = new MutationObserver(() => {
      setIsDark(getIsDarkMode());
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      window.removeEventListener("settings-changed", handleSettingsChange);
      observer.disconnect();
    };
  }, []);

  // Swap map style when isDark changes
  useEffect(() => {
    if (!mapRef.current) return;
    const newStyle = isDark ? CARTO_DARK_STYLE : CARTO_LIGHT_STYLE;
    mapRef.current.setStyle(newStyle);
  }, [isDark]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const mapInstance = new maplibregl.Map({
      container: containerRef.current,
      style: isDark ? CARTO_DARK_STYLE : CARTO_LIGHT_STYLE,
      center: toLngLat(center || SURAT_CENTER),
      zoom: zoom || DEFAULT_ZOOM,
      attributionControl: true,
      dragRotate: false,
      pitchWithRotate: false,
    });

    mapInstance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    mapInstance.on("load", () => {
      setIsLoaded(true);
      setStyleReady(true);
    });
    // Only set styleReady to true, never back to false after initial load
    mapInstance.on("styledata", () => {
      if (mapInstance.isStyleLoaded()) {
        setStyleReady(true);
      }
    });

    mapRef.current = mapInstance;
    setMap(mapInstance);

    return () => {
      mapInstance.remove();
      mapRef.current = null;
      setMap(null);
      setIsLoaded(false);
      setStyleReady(false);
    };
  }, []);

  useEffect(() => {
    if (!map) return;
    const nextCenter = toLngLat(center || SURAT_CENTER);
    const nextZoom = zoom || DEFAULT_ZOOM;
    const prev = lastViewRef.current;
    const centerChanged =
      !prev.center ||
      prev.center[0] !== nextCenter[0] ||
      prev.center[1] !== nextCenter[1];
    const zoomChanged = prev.zoom !== nextZoom;
    if (centerChanged && !zoomChanged) {
      map.easeTo({ center: nextCenter, duration: 300 });
      lastViewRef.current.center = nextCenter;
    } else if (centerChanged || zoomChanged) {
      map.easeTo({ center: nextCenter, zoom: nextZoom, duration: 300 });
      lastViewRef.current = { center: nextCenter, zoom: nextZoom };
    }
  }, [map, center, zoom]);

  useEffect(() => {
    if (!map) return;
    const updateZoomFromSettings = () => {
      try {
        const stored = localStorage.getItem("vigilo_zoom");
        if (stored) {
          const zoomLevel = JSON.parse(stored)[0];
          if (typeof zoomLevel === "number") map.setZoom(zoomLevel);
        }
      } catch {}
    };
    updateZoomFromSettings();
    window.addEventListener("settings-changed", updateZoomFromSettings);
    return () => window.removeEventListener("settings-changed", updateZoomFromSettings);
  }, [map]);

  useEffect(() => {
    if (!map || !onMapClick) return undefined;
    const handleClick = (e) => {
      if (!e?.lngLat) return;
      onMapClick(e.lngLat.lat, e.lngLat.lng);
    };
    map.on("click", handleClick);
    return () => map.off("click", handleClick);
  }, [map, onMapClick]);

  return (
    <MapLibreContext.Provider value={{ map, maplibregl, isLoaded, styleReady }}>
      <div className={`w-full h-full ${className}`} style={{ minHeight: "400px", ...style }}>
        <div ref={containerRef} className="w-full h-full" />
        {children}
      </div>
    </MapLibreContext.Provider>
  );
}
