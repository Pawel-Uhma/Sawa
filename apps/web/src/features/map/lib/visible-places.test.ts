import type { PlaceSummaryFeature } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { selectVisiblePlaces } from "./visible-places";

const place = (id: string, tags: string[], richness: number): PlaceSummaryFeature => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [20.98, 52.236] },
  properties: { id, name: id, kind: "site", interests: tags, richness },
});

const PLACES = [
  place("kercelak", ["war_uprising", "everyday_life"], 64),
  place("mural", ["street_art"], 1),
  place("bare", [], 1),
];

const ids = (places: PlaceSummaryFeature[]) => places.map((p) => p.properties.id);

describe("selectVisiblePlaces", () => {
  it("shows every place when no category is selected", () => {
    expect(ids(selectVisiblePlaces(PLACES, { interests: [], minRichness: 0 }))).toEqual([
      "kercelak",
      "mural",
      "bare",
    ]);
  });

  it("maps place tags to categories and keeps places in any selected one", () => {
    expect(ids(selectVisiblePlaces(PLACES, { interests: ["historical"], minRichness: 0 }))).toEqual(
      ["kercelak"],
    );
    expect(ids(selectVisiblePlaces(PLACES, { interests: ["cultural"], minRichness: 0 }))).toEqual([
      "kercelak",
      "mural",
    ]);
  });

  it("drops places without tags while a filter is active", () => {
    const visible = selectVisiblePlaces(PLACES, { interests: ["nature"], minRichness: 0 });
    expect(visible).toEqual([]);
  });

  it("hides places below the richness threshold", () => {
    expect(ids(selectVisiblePlaces(PLACES, { interests: [], minRichness: 2 }))).toEqual([
      "kercelak",
    ]);
  });
});
