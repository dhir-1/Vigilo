import { useEffect, useMemo, useRef } from "react";
import { useMapLibre } from "@/components/map/MapContext";

export function MapMarker({
  position,
  html,
  className = "",
  style = {},
  popupContent,
  popupOffset = 12,
}) {
  const { map, maplibregl, isLoaded } = useMapLibre() || {};
  const markerRef = useRef(null);

  const positionLngLat = useMemo(() => {
    if (!position || position.length < 2) return null;
    return [position[1], position[0]];
  }, [position]);

  useEffect(() => {
    if (!map || !maplibregl || !isLoaded || !positionLngLat) return undefined;

    const addMarker = () => {
      const element = document.createElement("div");
      if (html) {
        element.innerHTML = html;
        element.classList.add("maplibregl-marker");
      } else {
        element.className = `maplibregl-marker ${className}`.trim();
        Object.assign(element.style, style);
      }

      let popup;
      if (popupContent) {
        const container = document.createElement("div");
        if (typeof popupContent === "string") {
          container.innerHTML = popupContent;
        } else if (popupContent instanceof HTMLElement) {
          container.appendChild(popupContent);
        }

        popup = new maplibregl.Popup({
          offset: popupOffset,
          closeButton: true,
          closeOnClick: false,
          maxWidth: "none",
        }).setDOMContent(container);
      }

      // Stop clicks and pointer events from propagating to the map canvas
      const stopProp = (e) => e.stopPropagation();
      const handleMarkerClick = (e) => {
        e.stopPropagation();
        if (popup) {
          marker.togglePopup();
        }
      };
      element.addEventListener("click", handleMarkerClick);
      element.addEventListener("pointerdown", stopProp);
      element.addEventListener("pointerup", stopProp);
      element.addEventListener("dblclick", stopProp);

      const marker = new maplibregl.Marker({ element })
        .setLngLat(positionLngLat)
        .addTo(map);

      if (popup) marker.setPopup(popup);
      markerRef.current = { marker, popup, element, handleMarkerClick, stopProp };
    };

    if (map.isStyleLoaded()) {
      addMarker();
    } else {
      map.once("load", addMarker);
    }

    return () => {
      const ref = markerRef.current;
      if (ref) {
        if (ref.element && ref.handleMarkerClick) {
          ref.element.removeEventListener("click", ref.handleMarkerClick);
          ref.element.removeEventListener("pointerdown", ref.stopProp);
          ref.element.removeEventListener("pointerup", ref.stopProp);
          ref.element.removeEventListener("dblclick", ref.stopProp);
        }
        if (ref.popup) ref.popup.remove();
        ref.marker.remove();
        markerRef.current = null;
      }
      if (popupContent instanceof HTMLElement && typeof popupContent.__vigiloCleanup === "function") {
        popupContent.__vigiloCleanup();
      }
    };
  }, [map, maplibregl, isLoaded, positionLngLat, html, className, style, popupContent, popupOffset]);

  return null;
}
