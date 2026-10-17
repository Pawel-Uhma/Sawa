import { type RefObject, useEffect } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import type { PaintOverride } from "../lib/map-style";

/**
 * Repaints basemap layers (e.g. water) after the style loads and again after every style change
 * (a theme switch swaps the whole basemap). Only differing values are set, so `styledata` does not loop.
 */
export function useBasemapOverrides(
  mapRef: RefObject<MapRef | null>,
  isLoaded: boolean,
  overrides: readonly PaintOverride[],
) {
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!isLoaded || !map) return;
    const apply = () => {
      for (const { layerId, property, value } of overrides) {
        if (!map.getLayer(layerId) || map.getPaintProperty(layerId, property) === value) continue;
        map.setPaintProperty(layerId, property, value);
      }
    };
    apply();
    map.on("styledata", apply);
    return () => {
      map.off("styledata", apply);
    };
  }, [mapRef, isLoaded, overrides]);
}
