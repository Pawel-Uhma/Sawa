import type { ExpressionSpecification, Map as MapLibre } from "maplibre-gl";
import { type RefObject, useEffect } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import { BUILDINGS_MIN_ZOOM } from "../lib/navigation";

export const BUILDINGS_LAYER_ID = "sawa-buildings-3d";

/** OpenMapTiles source and layer of the OpenFreeMap basemaps (positron and dark). */
const BASEMAP_SOURCE = "openmaptiles";
const BUILDING_SOURCE_LAYER = "building";

/** OSM buildings without a height get one of a low Warsaw tenement. */
const DEFAULT_HEIGHT_M = 10;

/** Buildings grow out of the ground over one zoom step instead of popping up. */
function risingFrom(property: string, fallback: number): ExpressionSpecification {
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    BUILDINGS_MIN_ZOOM,
    0,
    BUILDINGS_MIN_ZOOM + 1,
    ["coalesce", ["get", property], fallback],
  ];
}

/**
 * OSM building blocks (`render_height` from OpenMapTiles) as `fill-extrusion` while the 3D view
 * is on (#199). Imperative, like the basemap overrides: a theme switch swaps the whole style and
 * the layer comes back after every `styledata`, always under the basemap's first label, so street
 * names and all our own layers stay above the blocks.
 */
export function useBuildings3d(
  mapRef: RefObject<MapRef | null>,
  isLoaded: boolean,
  isOn: boolean,
  color: string,
) {
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!isLoaded || !map) return;
    const apply = () => {
      if (!isOn) {
        if (map.getLayer(BUILDINGS_LAYER_ID)) map.removeLayer(BUILDINGS_LAYER_ID);
        return;
      }
      if (map.getLayer(BUILDINGS_LAYER_ID)) {
        if (map.getPaintProperty(BUILDINGS_LAYER_ID, "fill-extrusion-color") !== color) {
          map.setPaintProperty(BUILDINGS_LAYER_ID, "fill-extrusion-color", color);
        }
        return;
      }
      if (!map.getSource(BASEMAP_SOURCE)) return;
      map.addLayer(
        {
          id: BUILDINGS_LAYER_ID,
          type: "fill-extrusion",
          source: BASEMAP_SOURCE,
          "source-layer": BUILDING_SOURCE_LAYER,
          minzoom: BUILDINGS_MIN_ZOOM,
          paint: {
            "fill-extrusion-color": color,
            "fill-extrusion-height": risingFrom("render_height", DEFAULT_HEIGHT_M),
            "fill-extrusion-base": risingFrom("render_min_height", 0),
            "fill-extrusion-opacity": 0.85,
          },
        },
        firstLabelId(map),
      );
    };
    apply();
    map.on("styledata", apply);
    return () => {
      map.off("styledata", apply);
    };
  }, [mapRef, isLoaded, isOn, color]);
}

function firstLabelId(map: MapLibre): string | undefined {
  return map.getStyle()?.layers.find((layer) => layer.type === "symbol")?.id;
}
