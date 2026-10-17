import { describe, expect, it } from "vitest";
import { parseInterestsParam } from "./interests-param";

describe("parseInterestsParam", () => {
  it("returns no interests for a missing or empty param", () => {
    expect(parseInterestsParam(null)).toEqual([]);
    expect(parseInterestsParam("")).toEqual([]);
  });

  it("keeps known categories and drops unknown keys and duplicates", () => {
    expect(parseInterestsParam("cultural, ufo,historical,cultural")).toEqual([
      "cultural",
      "historical",
    ]);
  });
});
