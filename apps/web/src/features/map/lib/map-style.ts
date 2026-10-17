import { HACKATHON_VENUE, type Leg } from "@sawa/shared";
import type { ExpressionSpecification } from "maplibre-gl";

/** OpenFreeMap basemap: no API key, OSM data. */
export const BASEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

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

export const LEG_MODE_COLORS: Record<Leg["mode"], string> = {
  tram: "#d62828",
  bus: "#1d3557",
};

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
