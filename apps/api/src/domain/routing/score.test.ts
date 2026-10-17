import { describe, expect, it } from "vitest";
import { place } from "./__fixtures__/synthetic";
import { scorePlace, weightFromRichness } from "./score";

const interests = new Set(["war_uprising"]);

describe("scorePlace", () => {
  it("prefers a matching place over a closer non-matching one", () => {
    const matching = scorePlace(place("m", 0, 0, ["war_uprising"]), 140, interests);
    const other = scorePlace(place("o", 0, 0, ["architecture"]), 0, interests);
    expect(matching).toBeGreaterThan(other);
  });

  it("halves the value at the edge of visibility", () => {
    const p = place("p", 0, 0, []);
    expect(scorePlace(p, 150, interests)).toBeCloseTo(scorePlace(p, 0, interests) / 2, 6);
  });

  it("scales with weight", () => {
    expect(scorePlace(place("p", 0, 0, [], 3), 0, interests)).toBe(3);
  });
});

describe("weightFromRichness", () => {
  it("is 1 for an empty place and grows slower than richness", () => {
    expect(weightFromRichness(0)).toBe(1);
    expect(weightFromRichness(3)).toBe(3);
    expect(weightFromRichness(49)).toBeLessThan(8);
  });
});
