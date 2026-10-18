import { existsSync } from "node:fs";
import { join } from "node:path";
import { PLACE_KINDS, PLACE_SUBKINDS } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import {
  CONTRAST_GROUP_COLORS,
  FALLBACK_PLACE_ICON,
  MAP_ICONS,
  MAP_PALETTES,
  mapIconUrl,
  PLACE_GROUP_COLORS,
  PLACE_ICON_KINDS,
  PLACE_SUBKIND_GROUPS,
  paleColor,
  parsePlaceStickerId,
  placeKindColor,
  placeKindLabel,
  placeStickerColors,
  placeStickerExpression,
  placeStickerId,
  roadPaintOverrides,
  waterPaintOverrides,
} from "./map-style";
import PLACE_GLYPHS from "./place-glyphs.json";

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
  it("has a Polish label for every place kind and subkind", () => {
    for (const kind of [...KINDS, ...PLACE_SUBKINDS]) {
      expect(placeKindLabel(kind)).toBeTruthy();
    }
    expect(placeKindLabel("ufo")).toBeUndefined();
  });

  it("prefers the subkind over the kind", () => {
    expect(placeKindLabel("building", "palace")).toBe("pałac");
    expect(placeKindLabel("church", null)).toBe("świątynia");
  });

  it("has a glyph for every kind and subkind in the shared contract", () => {
    for (const kind of PLACE_KINDS) expect(PLACE_ICON_KINDS).toContain(kind);
    expect([...PLACE_ICON_KINDS].sort()).toEqual([...PLACE_SUBKINDS].sort());
    expect(Object.keys(PLACE_GLYPHS).sort()).toEqual([...PLACE_SUBKINDS].sort());
    for (const name of MAP_ICONS) {
      expect(existsSync(join(PUBLIC_DIR, mapIconUrl(name)))).toBe(true);
    }
  });

  it("builds sticker ids from the subkind, with the pin for unknown kinds", () => {
    const expression = placeStickerExpression("dark");
    expect(expression[0]).toBe("concat");
    expect(expression[1]).toBe("sawa-place-dark-");
    expect(JSON.stringify(expression)).toContain(`"${FALLBACK_PLACE_ICON}"]`);
  });

  it("reads back every sticker id it makes and ignores other images", () => {
    const sticker = { theme: "light", marker: "church" } as const;
    expect(placeStickerId(sticker)).toBe("sawa-place-light-church");
    expect(parsePlaceStickerId(placeStickerId(sticker))).toEqual(sticker);
    expect(parsePlaceStickerId("sawa-stop")).toBeNull();
    expect(parsePlaceStickerId("sawa-place-dark-ufo")).toBeNull();
    expect(parsePlaceStickerId("sawa-place-sepia-site")).toBeNull();
    expect(parsePlaceStickerId("sawa-place-contrast-site")).toEqual({
      theme: "contrast",
      marker: "site",
    });
    expect(parsePlaceStickerId("sawa-place-dark-site-none")).toBeNull();
  });

  it("colours markers by the group of their kind, grey for unknown kinds", () => {
    expect(placeKindColor("building", "palace")).toBe(PLACE_GROUP_COLORS.living);
    expect(placeKindColor("church")).toBe(PLACE_GROUP_COLORS.sacred);
    expect(placeKindColor("ufo")).toBe("#71717a");
    for (const subkind of PLACE_SUBKINDS) {
      expect(placeStickerColors(subkind)).toEqual({
        fill: PLACE_GROUP_COLORS[PLACE_SUBKIND_GROUPS[subkind]],
        outline: "#ffffff",
        halo: null,
      });
      expect(placeStickerColors(subkind, "contrast")).toEqual({
        fill: CONTRAST_GROUP_COLORS[PLACE_SUBKIND_GROUPS[subkind]],
        outline: "#000000",
        halo: "#ffffff",
      });
    }
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

describe("paleColor", () => {
  it("mixes a colour with white", () => {
    expect(paleColor("#d62828", 0)).toBe("#d62828");
    expect(paleColor("#d62828", 1)).toBe("#ffffff");
    expect(paleColor("#000000", 0.4)).toBe("#666666");
  });
});
