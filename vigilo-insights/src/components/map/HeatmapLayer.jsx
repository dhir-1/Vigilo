import { useState, useEffect, useMemo } from "react";
import { crimesAPI } from "@/lib/api";
import { useMapLibre } from "@/components/map/MapContext";

/**
 * AnimatedHeatmapLayer – driven by real crime data & the hour slider.
 *
 * How it works:
 *   1. On mount, fetches ALL verified crimes from the API.
 *   2. Groups them into grid cells (approx 500m × 500m).
 *   3. When `hour` changes (via the Play button or slider), it
 *      re-weights each cell based on how many crimes occurred in
 *      the matching time-of-day bucket, producing a smooth,
 *      animated "pulse" effect across the heatmap.
 */

// ─── Time-of-day buckets mapped to hours ────────────────────────
const getTimeBucket = (hour) => {
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 21) return "Evening";
  return "Night";
};

// ─── Grid helpers ───────────────────────────────────────────────
const CELL_SIZE = 0.005; // ~500 m at 21° latitude

const cellKey = (lat, lng) => {
  const r = Math.floor(lat / CELL_SIZE);
  const c = Math.floor(lng / CELL_SIZE);
  return `${r}:${c}`;
};

const cellCenter = (key) => {
  const [r, c] = key.split(":").map(Number);
  return [(r + 0.5) * CELL_SIZE, (c + 0.5) * CELL_SIZE];
};

// ─── Intensity → colour ────────────────────────────────────────
const getHeatColor = (ratio) => {
  // ratio: 0 → 1   (fraction of max count)
  if (ratio > 0.7) return { color: "#ef4444", fillOpacity: 0.55 }; // red
  if (ratio > 0.4) return { color: "#f59e0b", fillOpacity: 0.45 }; // amber
  if (ratio > 0.15) return { color: "#eab308", fillOpacity: 0.35 }; // yellow
  return { color: "#22c55e", fillOpacity: 0.25 }; // green
};

// ─── Fallback static zones (used while API data is loading) ─────
const fallbackZones = [
  { center: [21.185, 72.814], radius: 800, intensity: "low" },
  { center: [21.156, 72.771], radius: 600, intensity: "high" },
  { center: [21.167, 72.845], radius: 700, intensity: "high" },
  { center: [21.181, 72.801], radius: 900, intensity: "medium" },
  { center: [21.146, 72.846], radius: 500, intensity: "low" },
  { center: [21.195, 72.829], radius: 650, intensity: "medium" },
  { center: [21.172, 72.789], radius: 750, intensity: "high" },
  { center: [21.159, 72.820], radius: 550, intensity: "medium" },
];

const fallbackColor = (i) => {
  switch (i) {
    case "low": return { color: "#22c55e", fillOpacity: 0.15 };
    case "medium": return { color: "#eab308", fillOpacity: 0.2 };
    case "high": return { color: "#ef4444", fillOpacity: 0.25 };
    default: return { color: "#6b7280", fillOpacity: 0.1 };
  }
};

export function HeatmapLayer({ visible, hour = 12 }) {
  const [crimes, setCrimes] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Opacity user preference
  const [opacityScale, setOpacityScale] = useState(0.7);

  useEffect(() => {
    const updateOpacity = () => {
      try {
        const stored = localStorage.getItem("vigilo_heatmap");
        if (stored) setOpacityScale(JSON.parse(stored)[0] / 100);
      } catch {}
    };
    updateOpacity();
    window.addEventListener("settings-changed", updateOpacity);
    return () => window.removeEventListener("settings-changed", updateOpacity);
  }, []);

  // Fetch crime data once
  useEffect(() => {
    crimesAPI
      .list({ limit: 500 })
      .then((data) => {
        setCrimes(Array.isArray(data) ? data : []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // Build grid cells with per-timebucket counts
  const gridCells = useMemo(() => {
    if (crimes.length === 0) return [];

    const cells = {}; // key → { total, buckets: { Morning:n, … }, severitySum }

    crimes.forEach((c) => {
      const key = cellKey(c.latitude, c.longitude);
      if (!cells[key]) {
        cells[key] = { total: 0, buckets: {}, severitySum: 0 };
      }
      cells[key].total += 1;
      const bucket = c.time_of_day || "Night";
      cells[key].buckets[bucket] = (cells[key].buckets[bucket] || 0) + 1;
      cells[key].severitySum += c.severity === "High" ? 3 : c.severity === "Medium" ? 2 : 1;
    });

    return Object.entries(cells).map(([key, data]) => ({
      key,
      center: cellCenter(key),
      total: data.total,
      buckets: data.buckets,
      avgSeverity: data.severitySum / data.total,
    }));
  }, [crimes]);

  // When hour changes, compute the weighted circles
  const heatCircles = useMemo(() => {
    if (gridCells.length === 0) return [];

    const currentBucket = getTimeBucket(hour);

    // Calculate raw weight per cell
    const weighted = gridCells.map((cell) => {
      const bucketCount = cell.buckets[currentBucket] || 0;
      // Blend: 60% time-specific + 40% total (so cells don't fully vanish)
      const weight = bucketCount * 0.6 + (cell.total / 4) * 0.4;
      return { ...cell, weight };
    });

    const maxWeight = Math.max(...weighted.map((w) => w.weight), 1);

    return weighted
      .filter((w) => w.weight > 0.05)
      .map((w) => {
        const ratio = w.weight / maxWeight;
        const style = getHeatColor(ratio);
        // Bigger radius for higher severity
        const baseRadius = 350 + ratio * 450 + w.avgSeverity * 40;
        return {
          key: w.key,
          center: w.center,
          radius: Math.round(baseRadius),
          style,
        };
      });
  }, [gridCells, hour]);

  const { map, isLoaded, styleReady } = useMapLibre() || {};

  const heatFeatures = useMemo(() => {
    if (!visible) return [];
    const points = (loaded && heatCircles.length > 0)
      ? heatCircles.map((circle) => ({
          center: circle.center,
          weight: circle.radius,
        }))
      : fallbackZones.map((zone) => ({
          center: zone.center,
          weight: zone.intensity === "high" ? 1 : zone.intensity === "medium" ? 0.6 : 0.3,
        }));

    const maxWeight = Math.max(...points.map((p) => p.weight), 1);

    return points.map((p, idx) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [p.center[1], p.center[0]],
      },
      properties: {
        id: idx,
        weight: Math.max(0.12, p.weight / maxWeight),
      },
    }));
  }, [visible, loaded, heatCircles]);

  useEffect(() => {
    if (!map || !isLoaded || !styleReady) return undefined;

    const sourceId = "vigilo-heatmap-source";
    const glowLayerId = "vigilo-heatmap-glow-layer";
    const layerId = "vigilo-heatmap-layer";
    const data = {
      type: "FeatureCollection",
      features: heatFeatures,
    };

    const ensureSource = () => {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, { type: "geojson", data });
      } else {
        map.getSource(sourceId).setData(data);
      }
    };

    const updateLayers = () => {
      if (!map.isStyleLoaded()) return;

      const glowOpacity = Math.min(0.8, Math.max(0.4, opacityScale * 0.9));
      const heatmapOpacity = Math.min(0.9, Math.max(0.5, opacityScale * 1.0));

      if (!visible) {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getLayer(glowLayerId)) map.removeLayer(glowLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
        return;
      }

      ensureSource();

      if (!map.getLayer(glowLayerId)) {
        map.addLayer({
          id: glowLayerId,
          type: "circle",
          source: sourceId,
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10, ["interpolate", ["linear"], ["get", "weight"], 0.12, 16, 1, 38],
              13, ["interpolate", ["linear"], ["get", "weight"], 0.12, 24, 1, 58],
              16, ["interpolate", ["linear"], ["get", "weight"], 0.12, 34, 1, 82],
            ],
            "circle-color": [
              "interpolate",
              ["linear"],
              ["get", "weight"],
              0.12, "rgba(74,222,128,0.1)",
              0.35, "rgba(250,204,21,0.15)",
              0.65, "rgba(251,146,60,0.2)",
              1, "rgba(248,113,113,0.24)",
            ],
            "circle-blur": 0.9,
            "circle-opacity": glowOpacity,
          },
        });
      } else {
        map.setPaintProperty(glowLayerId, "circle-opacity", glowOpacity);
      }

      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: "heatmap",
          source: sourceId,
          paint: {
            "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0.12, 0.35, 1, 1.25],
            "heatmap-intensity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10, 1.1,
              13, 1.6,
              16, 2.1,
            ],
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10, 20,
              13, 38,
              15, 54,
              17, 72,
            ],
            "heatmap-opacity": heatmapOpacity,
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0, "rgba(0,0,0,0)",
              0.15, "rgba(74,222,128,0.2)",
              0.35, "rgba(250,204,21,0.3)",
              0.55, "rgba(251,146,60,0.4)",
              0.8, "rgba(248,113,113,0.5)",
              1, "rgba(239,68,68,0.62)",
            ],
          },
        });
      } else {
        map.setPaintProperty(layerId, "heatmap-opacity", heatmapOpacity);
      }
    };

    updateLayers();
    const handleStyleData = () => {
      if (map.isStyleLoaded()) {
        updateLayers();
      }
    };
    map.on("styledata", handleStyleData);

    return () => {
      map.off("styledata", handleStyleData);
    };
  }, [map, isLoaded, styleReady, visible, heatFeatures, opacityScale]);

  return null;
}
