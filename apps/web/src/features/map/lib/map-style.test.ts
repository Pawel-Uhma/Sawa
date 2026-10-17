import { existsSync } from "node:fs";
import { join } from "node:path";
import { PLACE_KINDS } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import {
  FALLBACK_PLACE_ICON,
  MAP_ICONS,
  MAP_PALETTES,
  mapIconId,
  mapIconUrl,
  PLACE_ICON_KINDS,
  PLACE_KIND_LABELS,
  placeKindColor,
  placeKindIconExpression,
  UNKNOWN_KIND_COLOR,
  waterPaintOverrides,
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

  it("paints water fills, river lines and their labels with the theme's blues", () => {
    const overrides = waterPaintOverrides(MAP_PALETTES.dark);
    expect(overrides).toContainEqual({
      layerId: "water",
      property: "fill-color",
      value: MAP_PALETTES.dark.water,
    });
    expect(overrides).toContainEqual({
      layerId: "waterway",
      property: "line-color",
      value: MAP_PALETTES.dark.water,
    });
    expect(
      overrides.filter((o) => o.property === "text-color").every((o) => o.value === "#7fa8cb"),
    ).toBe(true);
    expect(MAP_PALETTES.light.water).not.toBe(MAP_PALETTES.dark.water);
  });
});
