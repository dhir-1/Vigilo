import { useEffect, useMemo, useRef } from "react";
import { useMapLibre } from "@/components/map/MapContext";

const toLngLat = (pos) => {
  if (!pos || pos.length < 2) return null;
  const lat = Number(pos[0]);
  const lng = Number(pos[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lng, lat];
};

const normalizeDash = (dashArray) => {
  if (!dashArray) return undefined;
  if (Array.isArray(dashArray)) return dashArray;
  if (typeof dashArray === "string") {
    return dashArray.split(/[,\s]+/).map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0);
  }
  return undefined;
};

export function MapPolyline({
  id,
  positions = [],
  color = "#22c55e",
  weight = 4,
  opacity = 1,
  dashArray,
  onClick,
}) {
  const { map, isLoaded, styleReady } = useMapLibre() || {};

  const lineData = useMemo(() => {
    const coords = positions.map(toLngLat).filter(Boolean);
    if (coords.length < 2) return null;
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: coords,
          },
          properties: {},
        },
      ],
    };
  }, [positions]);

  useEffect(() => {
    if (!map || !isLoaded || !id || !lineData) return undefined;

    const sourceId = `route-source-${id}`;
    const layerId = `route-layer-${id}`;

    // Wait for style to be loaded before adding layers
    const addRoute = () => {
      if (!map.isStyleLoaded()) return;

      // Add or update the source
      const existingSource = map.getSource(sourceId);
      if (existingSource) {
        existingSource.setData(lineData);
      } else {
        map.addSource(sourceId, { type: "geojson", data: lineData });
      }

      // Add or update the layer
      if (!map.getLayer(layerId)) {
        const paintProps = {
          "line-color": color,
          "line-width": weight,
          "line-opacity": opacity,
        };
        const dash = normalizeDash(dashArray);
        if (dash && dash.length > 0) {
          paintProps["line-dasharray"] = dash;
        }

        map.addLayer({
          id: layerId,
          type: "line",
          source: sourceId,
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: paintProps,
        });
      } else {
        // Layer already exists — just update paint properties
        map.setPaintProperty(layerId, "line-color", color);
        map.setPaintProperty(layerId, "line-width", weight);
        map.setPaintProperty(layerId, "line-opacity", opacity);

        const dash = normalizeDash(dashArray);
        if (dash && dash.length > 0) {
          map.setPaintProperty(layerId, "line-dasharray", dash);
        }
      }
    };

    // If style is loaded, add immediately; otherwise wait for load event
    if (map.isStyleLoaded()) {
      addRoute();
    } else {
      map.once("load", addRoute);
    }

    // Click / hover handlers
    let clickHandler, enterHandler, leaveHandler;
    if (onClick) {
      clickHandler = () => onClick();
      enterHandler = () => { map.getCanvas().style.cursor = "pointer"; };
      leaveHandler = () => { map.getCanvas().style.cursor = ""; };
      map.on("click", layerId, clickHandler);
      map.on("mouseenter", layerId, enterHandler);
      map.on("mouseleave", layerId, leaveHandler);
    }

    return () => {
      if (onClick && clickHandler) {
        map.off("click", layerId, clickHandler);
        map.off("mouseenter", layerId, enterHandler);
        map.off("mouseleave", layerId, leaveHandler);
      }
      try {
        if (map.getStyle()) {
          if (map.getLayer(layerId)) map.removeLayer(layerId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        }
      } catch {
        // Map may have been destroyed
      }
    };
  }, [map, isLoaded, id, lineData, color, weight, opacity, dashArray, onClick]);

  return null;
}
