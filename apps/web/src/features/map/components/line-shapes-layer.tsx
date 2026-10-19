import type { Route, TrackVehiclesResponse } from "@sawa/shared";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import { lineShapesToGeoJson } from "../lib/route-to-geojson";
import { FADED_OPACITY, legValue } from "./route-layer";

type LineShapesLayerProps = {
  route: Route;
  /** Latest answer of `POST /v1/vehicles/track`: it carries the lines' shapes. */
  data: TrackVehiclesResponse | undefined;
  /** Legs picked in the "Dojazd" list: only the whole route of their line stays visible. */
  highlightLegs?: readonly number[] | null;
};

/**
 * The whole route of each line ridden, terminus to terminus: a thin, faint line in the leg's
 * colour. Mounted right before `RouteLayer`, so the planned stretch is drawn on top of it.
 */
export function LineShapesLayer({ route, data, highlightLegs = null }: LineShapesLayerProps) {
  const shapes = useMemo(() => lineShapesToGeoJson(route, data), [route, data]);
  return (
    <Source id="line-shapes" type="geojson" data={shapes}>
      <Layer
        id="line-shape"
        type="line"
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{
          "line-color": ["get", "color"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 11, 1.5, 16, 3],
          "line-opacity": legValue(highlightLegs, 0.6, 0.35 * FADED_OPACITY, 0.35),
        }}
      />
    </Source>
  );
}
