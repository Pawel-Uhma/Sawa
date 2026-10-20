import { describe, expect, it } from "vitest";
import { jaccard, pickDiverse, type RideCandidate, seededUnit } from "./diverse-rides";

const candidate = (
  key: string,
  value: number,
  placeIds: string[],
  lines: string[] = [key],
): RideCandidate<string> => ({ item: key, key, value, placeIds, lines });

describe("jaccard", () => {
  it("is the share of shared items in all items", () => {
    expect(jaccard(["a", "b"], ["b", "c"])).toBeCloseTo(1 / 3);
    expect(jaccard(["a"], ["a"])).toBe(1);
    expect(jaccard(["a"], ["b"])).toBe(0);
    expect(jaccard([], [])).toBe(1);
  });
});

describe("seededUnit", () => {
  it("gives the same number for the same seed and key, in [0, 1)", () => {
    expect(seededUnit(7, "x")).toBe(seededUnit(7, "x"));
    expect(seededUnit(7, "x")).not.toBe(seededUnit(8, "x"));
    for (let seed = 0; seed < 50; seed++) {
      const u = seededUnit(seed, "route");
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
    }
  });
});

describe("pickDiverse", () => {
  const best = candidate("best", 10, ["a", "b", "c", "d"]);
  const copy = candidate("copy", 9.9, ["a", "b", "c", "e"]);
  const other = candidate("other", 8, ["x", "y", "z", "a"]);
  const third = candidate("third", 6, ["p", "q"]);

  it("starts with the best and skips its near-copies", () => {
    const picked = pickDiverse([copy, other, best, third], { count: 3 }).map((c) => c.item);
    expect(picked).toEqual(["best", "other", "third"]);
  });

  it("returns fewer when the rest are near-copies", () => {
    expect(pickDiverse([best, copy], { count: 3 }).map((c) => c.item)).toEqual(["best"]);
  });

  it("keeps the caller's order for equal values", () => {
    const a = candidate("a", 1, ["1"]);
    const b = candidate("b", 1, ["2"]);
    expect(pickDiverse([b, a], { count: 1 })[0]?.item).toBe("b");
  });

  it("picks the same for the same seed", () => {
    const all = [best, copy, other, third];
    const pick = (seed: number) => pickDiverse(all, { count: 2, seed }).map((c) => c.item);
    expect(pick(3)).toEqual(pick(3));
  });

  it("differs from routes picked before and returns only new ones", () => {
    const picked = pickDiverse([copy, other], { count: 1, picked: [best] });
    expect(picked.map((c) => c.item)).toEqual(["other"]);
  });
});
