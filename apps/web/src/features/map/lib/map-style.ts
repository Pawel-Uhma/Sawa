import { HACKATHON_VENUE, PLACE_SUBKINDS, type PlaceSubkind } from "@sawa/shared";
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
  },
};

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

export const UNKNOWN_KIND_COLOR = "#71717a";

/** Marker colour groups, same as `GRUPY` in docs/ui/ikony-mapy/znaczniki.mjs. */
export const PLACE_GROUP_COLORS = {
  living: "#4f6d9a",
  institutions: "#2b7c8c",
  culture: "#d4902a",
  work: "#7a5a3c",
  memory: "#b5543c",
  sacred: "#8e4585",
  nature: "#3f7d5a",
  other: "#6b7280",
} as const;
type PlaceGroup = keyof typeof PLACE_GROUP_COLORS;

/** Group of each subkind (PLACE_SUBKINDS); the 9 kinds are subkinds too, for places without one. */
export const PLACE_SUBKIND_GROUPS: Record<PlaceSubkind, PlaceGroup> = {
  tenement: "living",
  building: "living",
  palace: "living",
  manor: "living",
  housing: "living",
  street: "living",
  school: "institutions",
  university: "institutions",
  hospital: "institutions",
  office: "institutions",
  trade: "institutions",
  museum: "culture",
  theatre: "culture",
  cinema: "culture",
  library: "culture",
  mural: "culture",
  factory: "work",
  station: "work",
  bridge: "work",
  monument: "memory",
  plaque: "memory",
  fortress: "memory",
  prison: "memory",
  event: "memory",
  church: "sacred",
  chapel: "sacred",
  orthodox: "sacred",
  synagogue: "sacred",
  cemetery: "sacred",
  park: "nature",
  garden: "nature",
  water: "nature",
  pitch: "nature",
  stadium: "nature",
  site: "other",
};

export const PLACE_SUBKIND_LABELS: Record<PlaceSubkind, string> = {
  tenement: "kamienica",
  building: "budynek",
  palace: "pałac",
  manor: "dwór, willa",
  housing: "osiedle",
  street: "ulica, plac",
  school: "szkoła",
  university: "uczelnia",
  hospital: "szpital",
  office: "urząd",
  trade: "handel",
  museum: "muzeum",
  theatre: "teatr",
  cinema: "kino",
  library: "biblioteka",
  mural: "mural",
  factory: "fabryka",
  station: "dworzec",
  bridge: "most",
  monument: "pomnik",
  plaque: "tablica",
  fortress: "fort, koszary",
  prison: "więzienie",
  event: "wydarzenie",
  church: "świątynia",
  chapel: "kaplica",
  orthodox: "cerkiew",
  synagogue: "synagoga",
  cemetery: "cmentarz",
  park: "park",
  garden: "ogród",
  water: "woda",
  pitch: "boisko",
  stadium: "obiekt sportowy",
  site: "miejsce",
};

/** Subkind when the place has one, otherwise its kind (every kind is also a subkind). */
function markerOf(kind: string, subkind?: string | null): PlaceSubkind | undefined {
  const key = subkind ?? kind;
  return key in PLACE_SUBKIND_GROUPS ? (key as PlaceSubkind) : undefined;
}

export function placeKindLabel(kind: string, subkind?: string | null): string | undefined {
  const marker = markerOf(kind, subkind);
  return marker && PLACE_SUBKIND_LABELS[marker];
}

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
 * Map icons in `public/map-icons/`, 96 px PNGs registered with pixelRatio 2, so icon-size 1 is 48 css px.
 * Places are "sticker" markers picked 17.10: a solid glyph in the group colour with a white outline,
 * one shape per subkind. Generated by `docs/ui/ikony-mapy/znaczniki.mjs`.
 */
export const PLACE_ICON_KINDS = PLACE_SUBKINDS;
export const MAP_ICONS = [...PLACE_ICON_KINDS, "stop", "tram", "bus"] as const;
export const MAP_ICON_PIXEL_RATIO = 2;
export const FALLBACK_PLACE_ICON = "site";

export function mapIconId(name: string): string {
  return `sawa-${name}`;
}

export function mapIconUrl(name: string): string {
  return `/map-icons/${name}.png`;
}

/** Feature property the marker follows: `subkind`, or `kind` for places the seed has not given one. */
const MARKER: ExpressionSpecification = ["coalesce", ["get", "subkind"], ["get", "kind"]];

/** MapLibre `match` expression: icon id by subkind, pin for anything without its own icon. */
export function placeKindIconExpression(): ExpressionSpecification {
  const pairs = PLACE_ICON_KINDS.flatMap((kind) => [kind, mapIconId(kind)]);
  // The spread tuple is not assignable to the fixed-arity `match` type.
  return [
    "match",
    MARKER,
    ...pairs,
    mapIconId(FALLBACK_PLACE_ICON),
  ] as unknown as ExpressionSpecification;
}

export function placeKindColor(kind: string, subkind?: string | null): string {
  const marker = markerOf(kind, subkind);
  return marker ? PLACE_GROUP_COLORS[PLACE_SUBKIND_GROUPS[marker]] : UNKNOWN_KIND_COLOR;
}

/** MapLibre `match` expression: circle colour by subkind group (same as placeKindColor). */
export function placeKindColorExpression(): ExpressionSpecification {
  const pairs = Object.entries(PLACE_GROUP_COLORS).flatMap(([group, color]) => [
    PLACE_SUBKINDS.filter((subkind) => PLACE_SUBKIND_GROUPS[subkind] === group),
    color,
  ]);
  return ["match", MARKER, ...pairs, UNKNOWN_KIND_COLOR] as unknown as ExpressionSpecification;
}
