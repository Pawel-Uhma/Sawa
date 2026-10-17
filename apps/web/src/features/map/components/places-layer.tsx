import type { PlaceSummaryFeature } from "@sawa/shared";
import type { ExpressionSpecification } from "maplibre-gl";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import {
  LABEL_FONT,
  type MapPalette,
  placeKindColorExpression,
  placeKindIconExpression,
} from "../lib/map-style";

export const PLACES_LAYER_ID = "places-circle";

/** Icon scale (1 = 48 css px): grows with zoom, and richer places are a bit larger. */
const ICON_SIZE: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  12,
  ["interpolate", ["linear"], ["get", "richness"], 1, 0.36, 40, 0.48],
  16,
  ["interpolate", ["linear"], ["get", "richness"], 1, 0.56, 40, 0.72],
];

type PlacesLayerProps = {
  places: PlaceSummaryFeature[];
  selectedId: string | null;
  /** Fade regular places while a route is shown, so its places stand out. */
  isDimmed: boolean;
  /** Icons registered in the style; without them places are coloured dots. */
  hasIcons: boolean;
  palette: MapPalette;
};

export function PlacesLayer({ places, selectedId, isDimmed, hasIcons, palette }: PlacesLayerProps) {
  const data = useMemo(() => ({ type: "FeatureCollection" as const, features: places }), [places]);
  const opacity = isDimmed ? palette.dimmedOpacity : 0.9;

  return (
    <Source id="places" type="geojson" data={data}>
      {hasIcons ? (
        <Layer
          id={PLACES_LAYER_ID}
          type="symbol"
          layout={{
            "icon-image": placeKindIconExpression(),
            "icon-size": ICON_SIZE,
            // Overlapping icons hide each other; richer places are placed first and win.
            "icon-padding": 1,
            "symbol-sort-key": ["-", 0, ["get", "richness"]],
          }}
          paint={{ "icon-opacity": opacity }}
        />
      ) : (
        // If the icons failed to load, coloured dots keep places visible.
        <Layer
          id={PLACES_LAYER_ID}
          type="circle"
          paint={{
            "circle-color": placeKindColorExpression(),
            "circle-radius": ["interpolate", ["linear"], ["get", "richness"], 1, 5, 10, 7, 40, 9],
            "circle-stroke-color": palette.ring,
            "circle-stroke-width": 1.5,
            "circle-opacity": opacity,
            "circle-stroke-opacity": opacity,
          }}
        />
      )}
      <Layer
        id="places-selected"
        type="circle"
        filter={["==", ["get", "id"], selectedId ?? ""]}
        paint={{
          "circle-radius": 20,
          "circle-opacity": 0,
          "circle-stroke-color": palette.selected,
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
          "text-offset": [0, 1.6],
          "text-max-width": 10,
          "text-optional": true,
        }}
        paint={{
          "text-color": palette.label,
          "text-halo-color": palette.labelHalo,
          "text-halo-width": 1.2,
        }}
      />
    </Source>
  );
}
