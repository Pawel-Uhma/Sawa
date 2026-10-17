import type { PlaceSummaryFeature } from "@sawa/shared";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import { LABEL_FONT, placeKindColorExpression } from "../lib/map-style";

export const PLACES_LAYER_ID = "places-circle";

type PlacesLayerProps = {
  places: PlaceSummaryFeature[];
  selectedId: string | null;
  /** Fade regular places while a route is shown, so its places stand out. */
  isDimmed: boolean;
};

export function PlacesLayer({ places, selectedId, isDimmed }: PlacesLayerProps) {
  const data = useMemo(() => ({ type: "FeatureCollection" as const, features: places }), [places]);
  const opacity = isDimmed ? 0.35 : 0.9;

  return (
    <Source id="places" type="geojson" data={data}>
      <Layer
        id={PLACES_LAYER_ID}
        type="circle"
        paint={{
          "circle-color": placeKindColorExpression(),
          "circle-radius": ["interpolate", ["linear"], ["get", "richness"], 1, 5, 10, 7, 40, 9],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
          "circle-opacity": opacity,
          "circle-stroke-opacity": opacity,
        }}
      />
      <Layer
        id="places-selected"
        type="circle"
        filter={["==", ["get", "id"], selectedId ?? ""]}
        paint={{
          "circle-radius": 12,
          "circle-opacity": 0,
          "circle-stroke-color": "#18181b",
          "circle-stroke-width": 3,
        }}
      />
      <Layer
        id="places-label"
        type="symbol"
        minzoom={16}
        layout={{
          "text-field": ["get", "name"],
          "text-font": LABEL_FONT,
          "text-size": 12,
          "text-anchor": "top",
          "text-offset": [0, 1],
          "text-max-width": 10,
          "text-optional": true,
        }}
        paint={{ "text-color": "#27272a", "text-halo-color": "#ffffff", "text-halo-width": 1.2 }}
      />
    </Source>
  );
}
