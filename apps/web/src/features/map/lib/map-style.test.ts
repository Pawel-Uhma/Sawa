import { describe, expect, it } from "vitest";
import { PLACE_KIND_LABELS, placeKindColor, UNKNOWN_KIND_COLOR } from "./map-style";

/** Kinds produced by the seed (apps/api/src/domain/place.ts). */
const KINDS = [
  "building",
  "monument",
  "plaque",
  "street",
  "site",
  "mural",
  "event",
  "church",
  "cemetery",
];

describe("map style", () => {
  it("has a colour and a Polish label for every place kind", () => {
    for (const kind of KINDS) {
      expect(placeKindColor(kind)).not.toBe(UNKNOWN_KIND_COLOR);
      expect(PLACE_KIND_LABELS[kind]).toBeTruthy();
    }
  });

  it("falls back to grey for an unknown kind", () => {
    expect(placeKindColor("ufo")).toBe(UNKNOWN_KIND_COLOR);
  });
});
