import { describe, expect, it } from "vitest";
import { parseInterestsParam } from "./interests-param";

describe("parseInterestsParam", () => {
  it("returns no interests for a missing or empty param", () => {
    expect(parseInterestsParam(null)).toEqual([]);
    expect(parseInterestsParam("")).toEqual([]);
  });

  it("keeps known keys and drops unknown ones and duplicates", () => {
    expect(parseInterestsParam("architecture, ufo,war_uprising,architecture")).toEqual([
      "architecture",
      "war_uprising",
    ]);
  });
});
