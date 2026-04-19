import { useMemo, memo } from "react";
import { getMarkerColor } from "@/lib/constants";
import { buildPopupElement } from "./SafetyPopup";
import { MapMarker } from "@/components/map/MapMarker";

export const CrimeMarker = memo(function CrimeMarker({ marker, onConfirmationChange }) {
  const color = getMarkerColor(marker.severity);

  const style = useMemo(() => {
    if (marker.data_source === "official_centroid") {
      return {
        width: "90px",
        height: "90px",
        borderRadius: "999px",
        background: color,
        opacity: 0.35,
        border: "none",
        cursor: "pointer",
        transform: "translate(-50%, -50%)", // perfectly center it
      };
    }
    
    return {
      width: "24px",
      height: "24px",
      borderRadius: "999px",
      border: `3px solid ${color}`,
      background: color,
      opacity: 0.9,
      boxShadow: `0 2px 10px rgba(0,0,0,0.4), 0 0 6px ${color}80`,
      cursor: "pointer",
    };
  }, [color, marker.data_source]);

  const position = useMemo(() => [marker.lat, marker.lng], [marker.lat, marker.lng]);

  const popupContent = useMemo(
    () => buildPopupElement(marker, onConfirmationChange),
    [marker, onConfirmationChange]
  );

  return (
    <MapMarker
      position={position}
      style={style}
      popupContent={popupContent}
    />
  );
});
