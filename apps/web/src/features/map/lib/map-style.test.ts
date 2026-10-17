import { existsSync } from "node:fs";
import { join } from "node:path";
import { PLACE_KINDS } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import {
  FALLBACK_PLACE_ICON,
  MAP_ICONS,
  mapIconId,
  mapIconUrl,
  PLACE_ICON_KINDS,
  PLACE_KIND_LABELS,
  placeKindColor,
  placeKindIconExpression,
  UNKNOWN_KIND_COLOR,
} from "./map-style";

const PUBLIC_DIR = join(__dirname, "../../../../public");

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

  it("has an icon for every kind in the shared contract", () => {
    expect([...PLACE_ICON_KINDS].sort()).toEqual([...PLACE_KINDS].sort());
    for (const name of MAP_ICONS) {
      expect(existsSync(join(PUBLIC_DIR, mapIconUrl(name)))).toBe(true);
    }
  });

  it("falls back to the pin icon for an unknown kind", () => {
    const expression = placeKindIconExpression();
    expect(expression.at(-1)).toBe(mapIconId(FALLBACK_PLACE_ICON));
    expect(expression).toContain(mapIconId("monument"));
  });

  it("falls back to grey for an unknown kind", () => {
    expect(placeKindColor("ufo")).toBe(UNKNOWN_KIND_COLOR);
  });
});
