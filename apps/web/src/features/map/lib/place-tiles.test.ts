import type { PlaceSummaryFeature } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import type { LngLatBounds } from "./bounds";
import {
  CITY_BBOX,
  MAX_PLACE_TILES,
  MIN_PLACES_ZOOM,
  mergeTilePlaces,
  placeBBoxesInView,
  tileBBoxParam,
  tilesInView,
} from "./place-tiles";

// Phone view around 42 Warsaw at zoom ~15.
const VENUE_VIEW: LngLatBounds = [
  [20.97, 52.23],
  [20.99, 52.24],
];

const place = (id: string, name = id): PlaceSummaryFeature => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [20.98, 52.236] },
  properties: { id, name, kind: "site", interests: [], richness: 1 },
});

describe("tilesInView", () => {
  it("covers a small view with the one tile it falls in", () => {
    expect(tilesInView(VENUE_VIEW, 15)).toEqual([{ x: 524, y: 2089 }]);
  });

  it("covers every tile the view touches", () => {
    const tiles = tilesInView(
      [
        [20.95, 52.22],
        [21.01, 52.26],
      ],
      13,
    );
    expect(tiles).toHaveLength(3 * 3);
    expect(tiles).toContainEqual({ x: 523, y: 2088 });
    expect(tiles).toContainEqual({ x: 525, y: 2090 });
  });

  it("fetches nothing below the minimum zoom", () => {
    expect(tilesInView(VENUE_VIEW, MIN_PLACES_ZOOM - 0.1)).toEqual([]);
  });

  it("keeps the tiles nearest the centre when the view is huge", () => {
    const tiles = tilesInView(
      [
        [20.0, 52.0],
        [22.0, 52.5],
      ],
      13,
    );
    expect(tiles).toHaveLength(MAX_PLACE_TILES);
    expect(tiles[0]).toEqual({ x: 525, y: 2090 });
  });
});

describe("placeBBoxesInView", () => {
  it("asks for the whole city once when zoomed out", () => {
    expect(placeBBoxesInView(VENUE_VIEW, MIN_PLACES_ZOOM - 0.1)).toEqual([CITY_BBOX]);
  });

  it("asks per tile when zoomed in", () => {
    expect(placeBBoxesInView(VENUE_VIEW, 15)).toEqual([tileBBoxParam({ x: 524, y: 2089 })]);
  });
});

describe("tileBBoxParam", () => {
  it("gives the tile edges as minLng,minLat,maxLng,maxLat without float noise", () => {
    expect(tileBBoxParam({ x: 522, y: 2088 })).toBe("20.88,52.2,20.92,52.225");
  });

  it("makes neighbouring tiles share an edge", () => {
    const [, , maxLng] = tileBBoxParam({ x: 524, y: 2089 }).split(",");
    const [minLng] = tileBBoxParam({ x: 525, y: 2089 }).split(",");
    expect(maxLng).toBe(minLng);
  });
});

describe("mergeTilePlaces", () => {
  it("joins tiles and drops a place returned by two of them", () => {
    const merged = mergeTilePlaces([[place("kercelak"), place("chlodna")], [place("kercelak")]]);
    expect(merged.map((p) => p.properties.id)).toEqual(["kercelak", "chlodna"]);
  });

  it("skips tiles that are still loading", () => {
    expect(mergeTilePlaces([undefined, [place("kercelak")]])).toHaveLength(1);
  });
});
