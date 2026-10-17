import {
  HACKATHON_VENUE,
  INTERESTS,
  type Interest,
  interestsOfTags,
  PLACE_SUBKINDS,
  type PlaceSubkind,
} from "@sawa/shared";
import type { ExpressionSpecification } from "maplibre-gl";
import type { Lang } from "@/features/i18n";

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
  /** Whole street drawn under its icon when the street is hovered or selected. */
  street: string;
  /** Group of places drawn as one circle with their count when zoomed out ("glass" style, 17.10). */
  clusterFill: string;
  clusterStroke: string;
  clusterText: string;
  clusterShadow: string;
  /** Opacity of regular places while a route is shown; dark needs more to stay visible. */
  dimmedOpacity: number;
  /** Rivers and lakes; the basemaps draw them grey, we repaint them blue. */
  water: string;
  waterLabel: string;
  /** Streets drawn over the basemap's own, which are barely visible (dark: #181818 on #0c0c0c). */
  roads: RoadColors;
};

type RoadColors = {
  minor: string;
  path: string;
  majorCasing: string;
  majorInner: string;
  motorwayCasing: string;
  motorwayInner: string;
  label: string;
  labelHalo: string;
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
    street: "#4f6d9a",
    clusterFill: "rgba(255, 255, 255, 0.92)",
    clusterStroke: "rgba(23, 112, 111, 0.35)",
    clusterText: "#17706f",
    clusterShadow: "rgba(16, 43, 42, 0.22)",
    dimmedOpacity: 0.35,
    water: "#b4d7ec",
    waterLabel: "#3d6e94",
    // Darker than the positron defaults, so minor streets stand out from the #f2f3f0 ground.
    roads: {
      minor: "#d2d7d5",
      path: "#dde1df",
      majorCasing: "#c0c7c5",
      majorInner: "#ffffff",
      motorwayCasing: "#b4bcba",
      motorwayInner: "#ffffff",
      label: "#4d5554",
      labelHalo: "#f2f3f0",
    },
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
    street: "#8fa9d4",
    clusterFill: "rgba(23, 33, 32, 0.92)",
    clusterStroke: "rgba(142, 209, 181, 0.4)",
    clusterText: "#8ed1b5",
    clusterShadow: "rgba(0, 0, 0, 0.5)",
    dimmedOpacity: 0.6,
    water: "#1f4a6b",
    waterLabel: "#7fa8cb",
    // Lighter than the ground, bigger roads lighter still, like night mode in Apple Maps.
    roads: {
      minor: "#2f3a39",
      path: "#283231",
      majorCasing: "#1a2221",
      majorInner: "#47534f",
      motorwayCasing: "#1a2221",
      motorwayInner: "#5b6865",
      label: "#9aa8a6",
      labelHalo: "#0c0c0c",
    },
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

export type PaintOverride = { layerId: string; property: string; value: string | number };

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

/** Road layers of the OpenFreeMap basemaps; dark and positron name the labels differently. */
const ROAD_LINE_LAYERS: [Exclude<keyof RoadColors, "label" | "labelHalo">, string[]][] = [
  ["minor", ["highway_minor"]],
  ["path", ["highway_path"]],
  ["majorCasing", ["highway_major_casing"]],
  ["majorInner", ["highway_major_inner"]],
  ["motorwayCasing", ["highway_motorway_casing", "highway_motorway_bridge_casing"]],
  ["motorwayInner", ["highway_motorway_inner", "highway_motorway_bridge_inner"]],
];
const ROAD_LABEL_LAYERS = [
  "highway_name_other",
  "highway_name_motorway",
  "highway-name-minor",
  "highway-name-major",
  "highway-name-path",
];

/** Basemap paint changes that make streets and their names readable in both themes. */
export function roadPaintOverrides(palette: MapPalette): PaintOverride[] {
  const { roads } = palette;
  const lines = ROAD_LINE_LAYERS.flatMap(([kind, layerIds]) =>
    layerIds.map((layerId) => ({ layerId, property: "line-color", value: roads[kind] })),
  );
  return [
    ...lines,
    // The basemaps draw minor streets at 0.9 opacity, which washes them out further.
    { layerId: "highway_minor", property: "line-opacity", value: 1 },
    ...ROAD_LABEL_LAYERS.flatMap((layerId) => [
      { layerId, property: "text-color", value: roads.label },
      { layerId, property: "text-halo-color", value: roads.labelHalo },
    ]),
  ];
}

/** Everything we repaint on the basemap: blue water and readable streets. */
export function basemapPaintOverrides(palette: MapPalette): PaintOverride[] {
  return [...waterPaintOverrides(palette), ...roadPaintOverrides(palette)];
}

/** Fonts available in the OpenFreeMap glyph server. */
export const LABEL_FONT = ["Noto Sans Regular"];
export const LABEL_FONT_BOLD = ["Noto Sans Bold"];

export const START_VIEW = {
  longitude: HACKATHON_VENUE.lng,
  latitude: HACKATHON_VENUE.lat,
  zoom: 15,
};

/**
 * Warsaw's city limits (lng 20.85–21.27, lat 52.10–52.37) plus a small margin.
 * The camera can't pan or zoom out past them, so the map never shows the rest of Poland.
 */
export const WARSAW_MAX_BOUNDS: [west: number, south: number, east: number, north: number] = [
  20.75, 52.05, 21.37, 52.42,
];

/**
 * Places with fewer facts + trivia than this are hidden from the map.
 * 0 shows everything (decision 17.10, docs/14-plan-mapy.md §6); raise to 2 to hide sparse records.
 */
export const MIN_PLACE_RICHNESS = 0;

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

export const PLACE_SUBKIND_LABELS_EN: Record<PlaceSubkind, string> = {
  tenement: "tenement",
  building: "building",
  palace: "palace",
  manor: "manor, villa",
  housing: "housing estate",
  street: "street, square",
  school: "school",
  university: "university",
  hospital: "hospital",
  office: "office",
  trade: "shop, market",
  museum: "museum",
  theatre: "theatre",
  cinema: "cinema",
  library: "library",
  mural: "mural",
  factory: "factory",
  station: "station",
  bridge: "bridge",
  monument: "monument",
  plaque: "plaque",
  fortress: "fort, barracks",
  prison: "prison",
  event: "event",
  church: "church",
  chapel: "chapel",
  orthodox: "orthodox church",
  synagogue: "synagogue",
  cemetery: "cemetery",
  park: "park",
  garden: "garden",
  water: "water",
  pitch: "pitch",
  stadium: "sports venue",
  site: "place",
};

/** Subkind when the place has one, otherwise its kind (every kind is also a subkind). */
function markerOf(kind: string, subkind?: string | null): PlaceSubkind | undefined {
  const key = subkind ?? kind;
  return key in PLACE_SUBKIND_LABELS ? (key as PlaceSubkind) : undefined;
}

/** Place label in the interface language; undefined for an unknown kind. */
export function placeKindLabel(
  kind: string,
  subkind?: string | null,
  lang: Lang = "pl",
): string | undefined {
  const marker = markerOf(kind, subkind);
  return marker && (lang === "en" ? PLACE_SUBKIND_LABELS_EN : PLACE_SUBKIND_LABELS)[marker];
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
 * Place markers are not here: they are drawn in the browser in their topic colour (place-stickers.ts).
 */
export const MAP_ICONS = ["stop", "tram", "bus"] as const;
export const MAP_ICON_PIXEL_RATIO = 2;

export function mapIconId(name: string): string {
  return `sawa-${name}`;
}

export function mapIconUrl(name: string): string {
  return `/map-icons/${name}.png`;
}

/**
 * Place markers, "sticker" style picked 17.10 (T-125): one glyph shape per subkind tells what the place is,
 * its colour tells the topic (T-151, #102), the same colour as the topic chips.
 * Glyph paths: place-glyphs.json; preview sheet: docs/ui/ikony-mapy/znaczniki.mjs.
 */
export const PLACE_ICON_KINDS = PLACE_SUBKINDS;
export const FALLBACK_PLACE_ICON: PlaceSubkind = "site";
/** Value of the `topic` property for places whose tags map to no topic. */
export const NO_TOPIC = "none";
const PLACE_STICKER_PREFIX = "sawa-place";

export type PlaceSticker = { theme: MapTheme; marker: PlaceSubkind; topic: Interest | null };

export function placeStickerId({ theme, marker, topic }: PlaceSticker): string {
  return `${PLACE_STICKER_PREFIX}-${theme}-${marker}-${topic ?? NO_TOPIC}`;
}

/** Inverse of placeStickerId; null for any other image id (MapLibre asks for every missing image). */
export function parsePlaceStickerId(id: string): PlaceSticker | null {
  const [prefix, name, theme, marker, topic, ...rest] = id.split("-");
  if (`${prefix}-${name}` !== PLACE_STICKER_PREFIX || rest.length > 0) return null;
  if (theme !== "light" && theme !== "dark") return null;
  if (!(PLACE_SUBKINDS as readonly string[]).includes(marker)) return null;
  if (topic !== NO_TOPIC && !(INTERESTS as readonly string[]).includes(topic)) return null;
  return {
    theme,
    marker: marker as PlaceSubkind,
    topic: topic === NO_TOPIC ? null : (topic as Interest),
  };
}

/** Glyph in the topic colour, outlined in the map's ring colour (white on light, near-black on dark). */
export function placeStickerColors(
  theme: MapTheme,
  topic: Interest | null,
): { fill: string; outline: string } {
  return {
    fill: topic ? TOPIC_COLORS[theme][topic].color : NO_TOPIC_COLOR[theme],
    outline: MAP_PALETTES[theme].ring,
  };
}

/** Feature property the marker follows: `subkind`, or `kind` for places the seed has not given one. */
const MARKER: ExpressionSpecification = ["coalesce", ["get", "subkind"], ["get", "kind"]];

/**
 * MapLibre expression: sticker id by subkind and the `topic` property that PlacesLayer adds.
 * Unknown kinds get the pin shape. The images are drawn on demand (`styleimagemissing`).
 */
export function placeStickerExpression(theme: MapTheme): ExpressionSpecification {
  return [
    "concat",
    `${PLACE_STICKER_PREFIX}-${theme}-`,
    ["match", MARKER, [...PLACE_ICON_KINDS], MARKER, FALLBACK_PLACE_ICON],
    "-",
    ["coalesce", ["get", "topic"], NO_TOPIC],
  ] as unknown as ExpressionSpecification;
}

/**
 * Colours of a topic (Interest), the one legend shared by map markers and topic chips (T-119, #53; T-151, #102).
 * `color`: place marker glyph, chip border, check and label (AA text on `surface` and `tint`).
 * `tint`: background of a picked chip. `onColor`: check mark drawn on `color`.
 * Stops and vehicles stay out of this palette.
 */
export type TopicColors = { color: string; tint: string; onColor: string };

export const TOPIC_COLORS: Record<MapTheme, Record<Interest, TopicColors>> = {
  light: {
    historical: { color: "#a8402c", tint: "#fbebe6", onColor: "#ffffff" },
    cultural: { color: "#7a3e9d", tint: "#f3eaf8", onColor: "#ffffff" },
    sports: { color: "#1f5faa", tint: "#e7eef9", onColor: "#ffffff" },
    nature: { color: "#2f7a34", tint: "#e6f3e6", onColor: "#ffffff" },
  },
  dark: {
    historical: { color: "#f0a28f", tint: "#3b231e", onColor: "#0e1615" },
    cultural: { color: "#d1a6ec", tint: "#30233a", onColor: "#0e1615" },
    sports: { color: "#97bbf0", tint: "#1d2b3f", onColor: "#0e1615" },
    nature: { color: "#93cf96", tint: "#1d3221", onColor: "#0e1615" },
  },
};

/** Places whose tags map to no topic (older seed). */
export const NO_TOPIC_COLOR: Record<MapTheme, string> = { light: "#71717a", dark: "#a1a1aa" };

/**
 * One topic for a place with several: the first one the user picked that the place has,
 * otherwise the first in INTERESTS order. Null when its tags map to no topic.
 */
export function placeTopic(
  tags: readonly string[],
  picked: readonly string[] = [],
): Interest | null {
  const topics = interestsOfTags(tags);
  return (
    picked.find((key): key is Interest => topics.includes(key as Interest)) ?? topics[0] ?? null
  );
}

export function placeTopicColor(
  tags: readonly string[],
  picked: readonly string[],
  theme: MapTheme,
): string {
  const topic = placeTopic(tags, picked);
  return topic ? TOPIC_COLORS[theme][topic].color : NO_TOPIC_COLOR[theme];
}

/** MapLibre `match` expression: colour by the `topic` property that PlacesLayer adds to each place. */
export function placeTopicColorExpression(theme: MapTheme): ExpressionSpecification {
  const pairs = INTERESTS.flatMap((topic) => [topic, TOPIC_COLORS[theme][topic].color]);
  return [
    "match",
    ["coalesce", ["get", "topic"], NO_TOPIC],
    ...pairs,
    NO_TOPIC_COLOR[theme],
  ] as unknown as ExpressionSpecification;
}
