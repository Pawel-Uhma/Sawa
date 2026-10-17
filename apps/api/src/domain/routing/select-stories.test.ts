import { describe, expect, it } from "vitest";
import type { CollectedPlace } from "./beam-search";
import { selectStoryPlaces } from "./select-stories";

const p = (placeId: string, etaSec: number, score: number): CollectedPlace => ({
  placeId,
  etaSec,
  score,
  distanceM: 0,
  legIndex: 0,
});

describe("selectStoryPlaces", () => {
  it("keeps the best place of a dense cluster and spaces the rest", () => {
    const picked = selectStoryPlaces(
      [p("a", 100, 1), p("b", 110, 5), p("c", 120, 2), p("d", 200, 1), p("e", 230, 3)],
      45,
    );
    expect(picked.map((x) => x.placeId)).toEqual(["b", "e"]);
  });

  it("returns places in ride order with gaps of at least the minimum", () => {
    const many = Array.from({ length: 50 }, (_, i) => p(`p${i}`, i * 7, (i * 37) % 11));
    const picked = selectStoryPlaces(many, 45);
    for (let i = 1; i < picked.length; i++) {
      expect((picked[i]?.etaSec ?? 0) - (picked[i - 1]?.etaSec ?? 0)).toBeGreaterThanOrEqual(45);
    }
  });

  it("keeps everything when places are already far apart", () => {
    expect(selectStoryPlaces([p("a", 0, 1), p("b", 60, 1)], 45)).toHaveLength(2);
  });
});
