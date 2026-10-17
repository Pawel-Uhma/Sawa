import type { ExpressionSpecification } from "maplibre-gl";
import { Layer } from "react-map-gl/maplibre";
import {
  STREET_LINES_SOURCE,
  STREET_LINES_SOURCE_LAYER,
  streetLineFilter,
} from "../lib/street-highlight";
import { PLACES_LAYER_ID } from "./places-layer";

/** Soft band under the street, wider than the basemap road at every zoom. */
const BAND_WIDTH: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  12,
  6,
  15,
  14,
  18,
  30,
];
const CORE_WIDTH: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  12,
  1.5,
  16,
  3,
  18,
  4,
];

type StreetLayerProps = {
  /** Street of the selected place: band and solid line. */
  selected: string | null;
  /** Street under the mouse (desktop): band only. */
  hovered: string | null;
  color: string;
};

/**
 * Whole street of a street place, drawn from the basemap's named road lines. Sits under the place
 * icons (and so under the route), so the icon stays where it was.
 */
export function StreetLayer({ selected, hovered, color }: StreetLayerProps) {
  const line = { source: STREET_LINES_SOURCE, "source-layer": STREET_LINES_SOURCE_LAYER } as const;
  const layout = { "line-cap": "round", "line-join": "round" } as const;
  const hoveredOnly = hovered === selected ? null : hovered;

  return (
    <>
      <Layer
        id="street-hover-band"
        type="line"
        {...line}
        beforeId={PLACES_LAYER_ID}
        filter={streetLineFilter(hoveredOnly)}
        layout={layout}
        paint={{
          "line-color": color,
          "line-opacity": 0.2,
          "line-width": BAND_WIDTH,
          "line-blur": 1,
        }}
      />
      <Layer
        id="street-selected-band"
        type="line"
        {...line}
        beforeId={PLACES_LAYER_ID}
        filter={streetLineFilter(selected)}
        layout={layout}
        paint={{
          "line-color": color,
          "line-opacity": 0.32,
          "line-width": BAND_WIDTH,
          "line-blur": 1,
        }}
      />
      <Layer
        id="street-selected-core"
        type="line"
        {...line}
        beforeId={PLACES_LAYER_ID}
        filter={streetLineFilter(selected)}
        layout={layout}
        paint={{ "line-color": color, "line-opacity": 0.9, "line-width": CORE_WIDTH }}
      />
    </>
  );
}
