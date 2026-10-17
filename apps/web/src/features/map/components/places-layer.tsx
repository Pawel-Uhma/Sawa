import type { PlaceSummaryFeature } from "@sawa/shared";
import type { ExpressionSpecification, SymbolLayerSpecification } from "maplibre-gl";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import {
  LABEL_FONT,
  type MapPalette,
  placeKindColorExpression,
  placeKindIconExpression,
} from "../lib/map-style";

export const PLACES_SOURCE_ID = "places";
export const PLACES_LAYER_ID = "places-circle";
/**
 * Icon scale (1 = 48 css px): grows with zoom, and richer places are a bit larger.
 * About 24 css px at zoom 15 (#90): the shapes stay readable, but icons no longer cover
 * the route line and its numbered stops (22 px), and fewer of them collide and hide.
 */
const ICON_SIZE: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  12,
  ["interpolate", ["linear"], ["get", "richness"], 1, 0.36, 40, 0.42],
  17,
  ["interpolate", ["linear"], ["get", "richness"], 1, 0.6, 40, 0.68],
];

/** Ring around the selected place, just outside the icon at every zoom. */
const SELECTED_RADIUS: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  12,
  13,
  17,
  19,
];

const LABEL_MIN_ZOOM = 16;
const LABEL_LAYOUT = {
  "text-font": LABEL_FONT,
  "text-size": 12,
  "text-anchor": "top",
  "text-offset": [0, 1.6],
  "text-max-width": 10,
  "text-optional": true,
} satisfies SymbolLayerSpecification["layout"];

function labelPaint(palette: MapPalette) {
  return {
    "text-color": palette.label,
    "text-halo-color": palette.labelHalo,
    "text-halo-width": 1.2,
  } satisfies SymbolLayerSpecification["paint"];
}

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
    <Source id={PLACES_SOURCE_ID} type="geojson" data={data}>
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
            // The name sits in the same symbol as the icon: when it does not fit, only the
            // text drops. A separate label layer is placed first and would hide the icons.
            ...LABEL_LAYOUT,
            "text-field": ["step", ["zoom"], "", LABEL_MIN_ZOOM, ["get", "name"]],
          }}
          paint={{ "icon-opacity": opacity, ...labelPaint(palette) }}
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
          "circle-radius": SELECTED_RADIUS,
          "circle-opacity": 0,
          "circle-stroke-color": palette.selected,
          "circle-stroke-width": 3,
        }}
      />
      {!hasIcons && (
        <Layer
          id="places-label"
          type="symbol"
          minzoom={LABEL_MIN_ZOOM}
          layout={{ ...LABEL_LAYOUT, "text-field": ["get", "name"] }}
          paint={labelPaint(palette)}
        />
      )}
    </Source>
  );
}
