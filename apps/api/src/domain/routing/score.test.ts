import { describe, expect, it } from "vitest";
import { place } from "./__fixtures__/synthetic";
import { RICHNESS_EXPONENT, scorePlace, weightFromRichness } from "./score";

const interests = new Set(["historical"]);

describe("scorePlace", () => {
  it("prefers a matching place over a closer non-matching one", () => {
    const matching = scorePlace(place("m", 0, 0, ["historical"]), 140, interests);
    const other = scorePlace(place("o", 0, 0, ["cultural"]), 0, interests);
    expect(matching).toBeGreaterThan(other);
  });

  it("prefers a modest matching place over a rich non-matching one", () => {
    const modest = scorePlace(place("m", 0, 0, ["historical"], 2), 0, interests);
    const rich = scorePlace(place("r", 0, 0, ["cultural"], 6), 0, interests);
    expect(modest).toBeGreaterThan(rich);
  });

  it("adds a little for each further matching interest", () => {
    const both = new Set(["historical", "cultural"]);
    const one = scorePlace(place("a", 0, 0, ["historical"]), 0, both);
    const two = scorePlace(place("b", 0, 0, ["historical", "cultural"]), 0, both);
    expect(two).toBeCloseTo(one * 1.5, 6);
  });

  it("weighs richness by familiarity: first-timers favour rich places more than locals", () => {
    const rich = place("r", 0, 0, ["historical"], 6);
    const modest = place("m", 0, 0, ["historical"], 2);
    const ratio = (richnessExponent: number) =>
      scorePlace(rich, 0, interests, { richnessExponent }) /
      scorePlace(modest, 0, interests, { richnessExponent });
    expect(ratio(RICHNESS_EXPONENT.first_time)).toBeCloseTo(3 ** 1.5, 6);
    expect(ratio(RICHNESS_EXPONENT.local)).toBeCloseTo(Math.sqrt(3), 6);
  });

  it("halves the value at the edge of visibility", () => {
    const p = place("p", 0, 0, ["historical"]);
    expect(scorePlace(p, 150, interests)).toBeCloseTo(scorePlace(p, 0, interests) / 2, 6);
  });

  it("scales a matching place with its weight", () => {
    expect(scorePlace(place("p", 0, 0, ["historical"], 3), 0, interests)).toBe(3);
  });
});

describe("weightFromRichness", () => {
  it("is 1 for an empty place and grows slower than richness", () => {
    expect(weightFromRichness(0)).toBe(1);
    expect(weightFromRichness(3)).toBe(3);
    expect(weightFromRichness(49)).toBeLessThan(8);
  });
});
