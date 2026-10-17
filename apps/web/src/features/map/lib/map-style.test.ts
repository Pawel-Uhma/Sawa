import { existsSync } from "node:fs";
import { join } from "node:path";
import { PLACE_KINDS, PLACE_SUBKINDS } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import {
  FALLBACK_PLACE_ICON,
  MAP_ICONS,
  MAP_PALETTES,
  mapIconId,
  mapIconUrl,
  PLACE_ICON_KINDS,
  placeKindColor,
  placeKindColorExpression,
  placeKindIconExpression,
  placeKindLabel,
  roadPaintOverrides,
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
  it("has a colour and a Polish label for every place kind and subkind", () => {
    for (const kind of [...KINDS, ...PLACE_SUBKINDS]) {
      expect(placeKindColor(kind)).not.toBe(UNKNOWN_KIND_COLOR);
      expect(placeKindLabel(kind)).toBeTruthy();
    }
  });

  it("prefers the subkind over the kind", () => {
    expect(placeKindLabel("building", "palace")).toBe("pałac");
    expect(placeKindColor("site", "park")).not.toBe(placeKindColor("site"));
    expect(placeKindLabel("church", null)).toBe("świątynia");
  });

  it("has an icon for every kind and subkind in the shared contract", () => {
    for (const kind of PLACE_KINDS) expect(PLACE_ICON_KINDS).toContain(kind);
    expect([...PLACE_ICON_KINDS].sort()).toEqual([...PLACE_SUBKINDS].sort());
    for (const name of MAP_ICONS) {
      expect(existsSync(join(PUBLIC_DIR, mapIconUrl(name)))).toBe(true);
    }
  });

  it("falls back to the pin icon for an unknown kind", () => {
    const expression = placeKindIconExpression();
    expect(expression.at(-1)).toBe(mapIconId(FALLBACK_PLACE_ICON));
    expect(expression).toContain(mapIconId("monument"));
    expect(placeKindColorExpression().at(-1)).toBe(UNKNOWN_KIND_COLOR);
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

  it("repaints streets and street names in both basemaps' layer names", () => {
    const overrides = roadPaintOverrides(MAP_PALETTES.dark);
    expect(overrides).toContainEqual({
      layerId: "highway_minor",
      property: "line-color",
      value: MAP_PALETTES.dark.roads.minor,
    });
    expect(overrides).toContainEqual({
      layerId: "highway_minor",
      property: "line-opacity",
      value: 1,
    });
    // dark names it highway_name_other, positron highway-name-minor
    const labelLayers = overrides.filter((o) => o.property === "text-color").map((o) => o.layerId);
    expect(labelLayers).toEqual(
      expect.arrayContaining(["highway_name_other", "highway-name-minor"]),
    );
  });

  it("keeps bigger streets brighter than minor ones on the dark map", () => {
    const { roads } = MAP_PALETTES.dark;
    const lightness = (hex: string) => Number.parseInt(hex.slice(1, 3), 16);
    expect(lightness(roads.majorInner)).toBeGreaterThan(lightness(roads.minor));
    expect(lightness(roads.motorwayInner)).toBeGreaterThan(lightness(roads.majorInner));
  });
});
