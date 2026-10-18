import type { PlaceSummaryFeature } from "@sawa/shared";
import type {
  ExpressionSpecification,
  FilterSpecification,
  SymbolLayerSpecification,
} from "maplibre-gl";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import { clusterBadgeExpression } from "../lib/cluster-badges";
import {
  LABEL_FONT,
  type MapLook,
  type MapPalette,
  placeKindColorExpression,
  placeStickerExpression,
} from "../lib/map-style";

export const PLACES_SOURCE_ID = "places";
export const PLACES_LAYER_ID = "places-circle";
export const PLACES_CLUSTER_LAYER_ID = "places-cluster";

/** From this zoom up every place is its own icon; below it nearby places merge into a count (T-118, T-150). */
const CLUSTER_MAX_ZOOM = 14;
const CLUSTER_RADIUS_PX = 44;
/** Smaller groups stay as separate icons: a "3" says less than the three places themselves. */
const CLUSTER_MIN_POINTS = 10;
const CLUSTERED: FilterSpecification = ["has", "point_count"];
const UNCLUSTERED: FilterSpecification = ["!", CLUSTERED];

/**
 * Icon scale (1 = 48 css px): grows with zoom, and richer places are a bit larger.
 * About 24 css px at zoom 15 (#90): the shapes stay readable, but icons no longer cover
 * the route line and its stops (38 px stickers), and fewer of them collide and hide.
 */
function iconSize(scale: number): ExpressionSpecification {
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    12,
    ["interpolate", ["linear"], ["get", "richness"], 1, 0.36 * scale, 40, 0.42 * scale],
    17,
    ["interpolate", ["linear"], ["get", "richness"], 1, 0.6 * scale, 40, 0.68 * scale],
  ];
}
const ICON_SIZE = iconSize(1);
/** High contrast: a fifth larger, at the cost of a few more icons hiding each other. */
const CONTRAST_ICON_SIZE = iconSize(1.2);

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
  /** Theme of the drawn stickers and badges, or high contrast. */
  theme: MapLook;
  selectedId: string | null;
  /** Fade regular places while a route is shown, so its places stand out. */
  isDimmed: boolean;
  /** Icons registered in the style; without them places are coloured dots. */
  hasIcons: boolean;
  palette: MapPalette;
};

export function PlacesLayer({
  places,
  theme,
  selectedId,
  isDimmed,
  hasIcons,
  palette,
}: PlacesLayerProps) {
  const data = useMemo(() => ({ type: "FeatureCollection" as const, features: places }), [places]);
  const opacity = isDimmed ? palette.dimmedOpacity : 0.9;

  return (
    <Source
      id={PLACES_SOURCE_ID}
      type="geojson"
      data={data}
      cluster
      clusterMaxZoom={CLUSTER_MAX_ZOOM}
      clusterRadius={CLUSTER_RADIUS_PX}
      clusterMinPoints={CLUSTER_MIN_POINTS}
    >
      {/* Glass circle with the count in the app font, drawn as an image (cluster-badges.ts). */}
      <Layer
        id={PLACES_CLUSTER_LAYER_ID}
        type="symbol"
        filter={CLUSTERED}
        layout={{
          "icon-image": clusterBadgeExpression(theme),
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        }}
        paint={{ "icon-opacity": opacity }}
      />
      {hasIcons ? (
        // One symbol per place: glyph and its outline are a single image, so a collision hides both (#90).
        <Layer
          id={PLACES_LAYER_ID}
          type="symbol"
          filter={UNCLUSTERED}
          layout={{
            "icon-image": placeStickerExpression(theme),
            "icon-size": theme === "contrast" ? CONTRAST_ICON_SIZE : ICON_SIZE,
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
        // If the icons failed to load, dots in the group colour keep places visible.
        <Layer
          id={PLACES_LAYER_ID}
          type="circle"
          filter={UNCLUSTERED}
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
          filter={UNCLUSTERED}
          layout={{ ...LABEL_LAYOUT, "text-field": ["get", "name"] }}
          paint={labelPaint(palette)}
        />
      )}
    </Source>
  );
}
