import { describe, expect, it } from "vitest";
import { INTEREST_TAGS, INTERESTS, interestsOfTags, PLACE_TAGS } from "./interests";

describe("interestsOfTags", () => {
  it("maps detailed place tags to broad categories", () => {
    expect(interestsOfTags(["war_uprising"])).toEqual(["historical"]);
    expect(interestsOfTags(["street_art"])).toEqual(["cultural"]);
    expect(interestsOfTags(["architecture"])).toEqual(["historical", "cultural"]);
    expect(interestsOfTags(["sport", "nature"])).toEqual(["sports", "nature"]);
  });

  it("returns nothing for untagged or unknown tags", () => {
    expect(interestsOfTags([])).toEqual([]);
    expect(interestsOfTags(["pizza"])).toEqual([]);
  });

  it("covers every place tag with at least one category", () => {
    const mapped = new Set(INTERESTS.flatMap((i) => INTEREST_TAGS[i]));
    expect(PLACE_TAGS.filter((t) => !mapped.has(t))).toEqual([]);
  });
});
