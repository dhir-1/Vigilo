import { createContext, useContext } from "react";

export const MapLibreContext = createContext(null);

export function useMapLibre() {
  return useContext(MapLibreContext);
}
