import { useState, useCallback } from "react";
import { SURAT_CENTER, DEFAULT_ZOOM } from "@/lib/constants";

export function useMap() {
  const [center, setCenter] = useState(SURAT_CENTER);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const toggleHeatmap = useCallback(() => {
    setShowHeatmap((prev) => !prev);
  }, []);

  const resetView = useCallback(() => {
    setCenter(SURAT_CENTER);
    setZoom(DEFAULT_ZOOM);
  }, []);

  return { center, setCenter, zoom, setZoom, showHeatmap, toggleHeatmap, resetView };
}
