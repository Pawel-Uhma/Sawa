import type { PlaceSummaryFeature } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { selectVisiblePlaces } from "./visible-places";

const place = (id: string, interests: string[], richness: number): PlaceSummaryFeature => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [20.98, 52.236] },
  properties: { id, name: id, kind: "site", interests, richness },
});

const PLACES = [
  place("kercelak", ["war_uprising", "everyday_life"], 64),
  place("hala", ["architecture"], 1),
  place("bare", [], 1),
];

const ids = (places: PlaceSummaryFeature[]) => places.map((p) => p.properties.id);

describe("selectVisiblePlaces", () => {
  it("shows every place when no interest is selected", () => {
    expect(ids(selectVisiblePlaces(PLACES, { interests: [], minRichness: 0 }))).toEqual([
      "kercelak",
      "hala",
      "bare",
    ]);
  });

  it("keeps places matching any selected interest", () => {
    const visible = selectVisiblePlaces(PLACES, {
      interests: ["architecture", "everyday_life"],
      minRichness: 0,
    });
    expect(ids(visible)).toEqual(["kercelak", "hala"]);
  });

  it("drops places without interests while a filter is active", () => {
    const visible = selectVisiblePlaces(PLACES, { interests: ["street_art"], minRichness: 0 });
    expect(visible).toEqual([]);
  });

  it("hides places below the richness threshold", () => {
    expect(ids(selectVisiblePlaces(PLACES, { interests: [], minRichness: 2 }))).toEqual([
      "kercelak",
    ]);
  });
});
