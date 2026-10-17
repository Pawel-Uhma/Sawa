import { HACKATHON_VENUE } from "@sawa/shared";
import type { ExpressionSpecification } from "maplibre-gl";

export type MapTheme = "light" | "dark";

/** OpenFreeMap basemaps: no API key, OSM data. The theme follows the system setting. */
export const BASEMAP_STYLE_URLS: Record<MapTheme, string> = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

/** Colours of our own layers that have to change with the basemap. */
export type MapPalette = {
  /** Outline under route lines and rings around dots, so they read on the basemap. */
  casing: string;
  ring: string;
  /** Numbered route place (not the active one) and its number. */
  stopFill: string;
  stopText: string;
  /** Ring around the selected place. */
  selected: string;
  /** Fill of the start and transfer rings. */
  boardingFill: string;
  label: string;
  labelHalo: string;
  walk: string;
  /** Group of places drawn as one circle with their count when zoomed out. */
  clusterFill: string;
  clusterText: string;
  /** Opacity of regular places while a route is shown; dark needs more to stay visible. */
  dimmedOpacity: number;
  /** Rivers and lakes; the basemaps draw them grey, we repaint them blue. */
  water: string;
  waterLabel: string;
};

export const MAP_PALETTES: Record<MapTheme, MapPalette> = {
  light: {
    casing: "#ffffff",
    ring: "#ffffff",
    stopFill: "#18181b",
    stopText: "#ffffff",
    selected: "#18181b",
    boardingFill: "#ffffff",
    label: "#27272a",
    labelHalo: "#ffffff",
    walk: "#52525b",
    clusterFill: "#3f3f46",
    clusterText: "#ffffff",
    dimmedOpacity: 0.35,
    water: "#b4d7ec",
    waterLabel: "#3d6e94",
  },
  dark: {
    // A light outline keeps the deep line colours (blue, violet) visible on the dark basemap.
    casing: "#d5dfdd",
    ring: "#0e1615",
    stopFill: "#e6efed",
    stopText: "#0e1615",
    selected: "#e6efed",
    boardingFill: "#0e1615",
    label: "#d5dfdd",
    labelHalo: "#0e1615",
    walk: "#a1a1aa",
    clusterFill: "#2c3d3b",
    clusterText: "#e6efed",
    dimmedOpacity: 0.6,
    water: "#1f4a6b",
    waterLabel: "#7fa8cb",
  },
};

/** Water layers of the OpenFreeMap basemaps (positron and dark name them the same, labels differ). */
const WATER_FILL_LAYERS = ["water"];
const WATER_LINE_LAYERS = ["waterway"];
const WATER_LABEL_LAYERS = [
  "waterway_line_label",
  "water_name_point_label",
  "water_name_line_label",
  "water_name",
];

export type PaintOverride = { layerId: string; property: string; value: string };

/** Basemap paint changes that make water blue; layers missing from a style are skipped by the caller. */
export function waterPaintOverrides(palette: MapPalette): PaintOverride[] {
  return [
    ...WATER_FILL_LAYERS.map((layerId) => ({
      layerId,
      property: "fill-color",
      value: palette.water,
    })),
    ...WATER_LINE_LAYERS.map((layerId) => ({
      layerId,
      property: "line-color",
      value: palette.water,
    })),
    ...WATER_LABEL_LAYERS.map((layerId) => ({
      layerId,
      property: "text-color",
      value: palette.waterLabel,
    })),
  ];
}

/** Fonts available in the OpenFreeMap glyph server. */
export const LABEL_FONT = ["Noto Sans Regular"];

export const START_VIEW = {
  longitude: HACKATHON_VENUE.lng,
  latitude: HACKATHON_VENUE.lat,
  zoom: 15,
};

/**
 * Places with fewer facts + trivia than this are hidden from the map.
 * 0 shows everything (decision 17.10, docs/14-plan-mapy.md §6); raise to 2 to hide sparse records.
 */
export const MIN_PLACE_RICHNESS = 0;

const ARCHITECTURE_COLOR = "#4f6d9a";
const MEMORIAL_COLOR = "#b5543c";
const MURAL_COLOR = "#d4902a";
const SACRED_COLOR = "#3f7d5a";
const SITE_COLOR = "#8e4585";
export const UNKNOWN_KIND_COLOR = "#71717a";

/** 9 kinds from the seed grouped into 5 colours. */
export const PLACE_KIND_COLORS: Record<string, string> = {
  building: ARCHITECTURE_COLOR,
  street: ARCHITECTURE_COLOR,
  monument: MEMORIAL_COLOR,
  plaque: MEMORIAL_COLOR,
  mural: MURAL_COLOR,
  church: SACRED_COLOR,
  cemetery: SACRED_COLOR,
  site: SITE_COLOR,
  event: SITE_COLOR,
};

export const PLACE_KIND_LABELS: Record<string, string> = {
  building: "budynek",
  street: "ulica",
  monument: "pomnik",
  plaque: "tablica",
  mural: "mural",
  church: "świątynia",
  cemetery: "cmentarz",
  site: "miejsce",
  event: "wydarzenie",
};

/** User position dot. */
export const USER_COLOR = "#2563eb";

/** End point the user picked for the ride. */
export const DESTINATION_COLOR = "#f2755f";

/** Route place the story is about right now. */
export const ACTIVE_STOP_COLOR = "#17706f";

/**
 * One colour per line of the ride, in the order the lines are boarded.
 * Kept away from the teal of the active stop and the coral of the destination.
 */
export const LINE_COLORS = ["#d62828", "#1d4ed8", "#7c3aed", "#e07a00", "#c2185b", "#4d7c0f"];

export function lineColor(lineIndex: number): string {
  return LINE_COLORS[lineIndex % LINE_COLORS.length];
}

/**
 * Map icons in `public/map-icons/`, flat style picked 17.10 (docs/ui/ikony-mapy/).
 * 96 px PNGs registered with pixelRatio 2, so icon-size 1 is 48 css px.
 */
export const PLACE_ICON_KINDS = [
  "building",
  "monument",
  "plaque",
  "street",
  "site",
  "mural",
  "event",
  "church",
  "cemetery",
] as const;
export const MAP_ICONS = [...PLACE_ICON_KINDS, "stop", "tram", "bus"] as const;
export const MAP_ICON_PIXEL_RATIO = 2;
export const FALLBACK_PLACE_ICON = "site";

export function mapIconId(name: string): string {
  return `sawa-${name}`;
}

export function mapIconUrl(name: string): string {
  return `/map-icons/${name}.png`;
}

/** MapLibre `match` expression: icon id by place kind, pin for kinds without their own icon. */
export function placeKindIconExpression(): ExpressionSpecification {
  const pairs = PLACE_ICON_KINDS.flatMap((kind) => [kind, mapIconId(kind)]);
  // The spread tuple is not assignable to the fixed-arity `match` type.
  return [
    "match",
    ["get", "kind"],
    ...pairs,
    mapIconId(FALLBACK_PLACE_ICON),
  ] as unknown as ExpressionSpecification;
}

export function placeKindColor(kind: string): string {
  return PLACE_KIND_COLORS[kind] ?? UNKNOWN_KIND_COLOR;
}

/** MapLibre `match` expression: circle colour by place kind (same groups as PLACE_KIND_COLORS). */
export function placeKindColorExpression(): ExpressionSpecification {
  return [
    "match",
    ["get", "kind"],
    ["building", "street"],
    ARCHITECTURE_COLOR,
    ["monument", "plaque"],
    MEMORIAL_COLOR,
    "mural",
    MURAL_COLOR,
    ["church", "cemetery"],
    SACRED_COLOR,
    ["site", "event"],
    SITE_COLOR,
    UNKNOWN_KIND_COLOR,
  ];
}
