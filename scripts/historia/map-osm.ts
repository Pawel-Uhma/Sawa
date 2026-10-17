// OSM parks and sports grounds (Overpass `out center tags`) → features in the docs/historia format,
// so the seed and the planner export read them like the curated places. Pure functions, no IO.

import type { PlaceTag } from "@sawa/shared";
import { z } from "zod";

export const OsmElementSchema = z.object({
  type: z.enum(["node", "way", "relation"]),
  id: z.number(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  center: z.object({ lat: z.number(), lon: z.number() }).optional(),
  // `out bb`: the bounding box of a way or relation, used for its size and centre.
  bounds: z
    .object({ minlat: z.number(), minlon: z.number(), maxlat: z.number(), maxlon: z.number() })
    .optional(),
  tags: z.record(z.string(), z.string()),
});
export type OsmElement = z.infer<typeof OsmElementSchema>;

/** Wikipedia lead paragraph for elements with a `wikipedia=pl:…` tag, fetched by the caller. */
export type WikiSummary = { title: string; extract: string; url: string };

const GREEN = ["park", "garden"];
const SPORT_GROUNDS = ["pitch", "stadium", "track", "fitness_station"];
const PUBLIC_SPORTS = ["swimming", "soccer", "athletics", "tennis", "climbing", "multi"];
// Commercial studios and generic labels make poor story stops.
const INSTITUTION = /ośrodek|osir|hala|stadion|pływalni|centrum sportu|skra|polonia|legia/i;
const GENERIC_NAME =
  /^(boisko( [a-z0-9]| treningowe)?$|budynek|hala (piłkarska|sportowa)$|siłownia (miejska|plenerowa|pod chmurką)$|kort( centralny| \d+)?$|\d+ - kort|orlik$|bieżnia$|pumptrack$|ścian(k)?a |squash z murem$|bezpłatne )/i;
// Community gardens, picnic lawns and pocket parks: many, tiny, nothing to tell.
const GENERIC_GREEN =
  /^(ogród (społeczn|sąsiedzk|sensoryczn)|międzypokoleniowy ogród|polan(a|ka)\b|rod |park kieszonkowy|eco skwerek|jordanek$)/i;
/** Outside WIDE_AREA a park without Wikipedia must be this big (5 ha), so the outskirts stay sparse. */
export const MIN_OUTER_GREEN_M2 = 50_000;
/** Parks and squares without Wikipedia need at least this bounding box (T-73: ~160 in WIDE_AREA). */
export const MIN_GREEN_M2 = 5000;

const SPORT_PL: Record<string, string> = {
  swimming: "pływanie",
  soccer: "piłka nożna",
  tennis: "tenis",
  basketball: "koszykówka",
  volleyball: "siatkówka",
  beachvolleyball: "siatkówka plażowa",
  handball: "piłka ręczna",
  athletics: "lekkoatletyka",
  climbing: "wspinaczka",
  ice_skating: "łyżwiarstwo",
  roller_skating: "wrotkarstwo",
  cycling: "kolarstwo",
  table_tennis: "tenis stołowy",
  squash: "squash",
  boxing: "boks",
  gymnastics: "gimnastyka",
};

const LEISURE_PL: Record<string, string> = {
  park: "park",
  garden: "ogród",
  pitch: "boisko",
  stadium: "stadion",
  track: "tor lub bieżnia",
  fitness_station: "siłownia plenerowa",
  sports_centre: "obiekt sportowy",
};

/** Which tag a kept element gets, or null when it is not worth a stop. */
export function osmTag(el: OsmElement): PlaceTag | null {
  const { tags } = el;
  const name = tags.name;
  const leisure = tags.leisure ?? "";
  if (!name || GENERIC_NAME.test(name)) return null;
  if (GREEN.includes(leisure)) return isNotableGreen(el) ? "nature" : null;
  if (SPORT_GROUNDS.includes(leisure)) return "sport";
  if (leisure === "sports_centre") {
    const sports = (tags.sport ?? "").split(";");
    return INSTITUTION.test(name) || sports.some((s) => PUBLIC_SPORTS.includes(s)) ? "sport" : null;
  }
  return null;
}

/** A park worth a stop: linked to Wikipedia, or not generic and large enough. */
function isNotableGreen(el: OsmElement): boolean {
  if (el.tags.wikipedia) return true;
  return !GENERIC_GREEN.test(el.tags.name ?? "") && bboxAreaM2(el) >= MIN_GREEN_M2;
}

/** Bounding box area in m²; 0 for nodes. Overestimates diagonal shapes, enough for a size cut. */
export function bboxAreaM2({ bounds: b }: OsmElement): number {
  if (!b) return 0;
  const cos = Math.cos((((b.minlat + b.maxlat) / 2) * Math.PI) / 180);
  return (b.maxlat - b.minlat) * 111_320 * ((b.maxlon - b.minlon) * 111_320 * cos);
}

/**
 * Outside WIDE_AREA only landmarks stay: places with Wikipedia, large parks, stadiums and
 * sports centres. Pitches and small squares there would crowd the map with little to tell.
 */
export function isOuterLandmark(el: OsmElement, tag: PlaceTag): boolean {
  if (el.tags.wikipedia) return true;
  if (tag === "nature") return bboxAreaM2(el) >= MIN_OUTER_GREEN_M2;
  return ["stadium", "sports_centre"].includes(el.tags.leisure ?? "");
}

/** Node position, Overpass `center`, or the middle of `bounds` (the same point Overpass gives). */
export function osmPosition(el: OsmElement): { lat: number; lng: number } | null {
  const b = el.bounds;
  const lat = el.lat ?? el.center?.lat ?? (b && (b.minlat + b.maxlat) / 2);
  const lng = el.lon ?? el.center?.lon ?? (b && (b.minlon + b.maxlon) / 2);
  return lat === undefined || lng === undefined ? null : { lat, lng };
}

export function mapOsmElement(el: OsmElement, tag: PlaceTag, wiki?: WikiSummary) {
  const position = osmPosition(el);
  if (!position) return null;
  const { lat, lng } = position;

  const osmUrl = `https://www.openstreetmap.org/${el.type}/${el.id}`;
  const leisure = LEISURE_PL[el.tags.leisure ?? ""] ?? "miejsce";
  const sports = (el.tags.sport ?? "")
    .split(";")
    .map((s) => SPORT_PL[s])
    .filter(Boolean);

  const fakty = [
    ...(wiki ? [wiki.extract] : []),
    `W OpenStreetMap oznaczone jako ${leisure}${sports.length ? `; dyscypliny: ${sports.join(", ")}` : ""}.`,
  ];
  const zrodla = [
    ...(wiki ? [{ tytul: `Wikipedia: ${wiki.title}`, url: wiki.url }] : []),
    { tytul: "OpenStreetMap (ODbL)", url: osmUrl },
  ];

  return {
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [lng, lat] as [number, number] },
    properties: {
      id: `osm-${el.type}-${el.id}`,
      nazwa: el.tags.name,
      typ: "miejsce",
      adres_dzis: el.tags["addr:street"]
        ? `${el.tags["addr:street"]} ${el.tags["addr:housenumber"] ?? ""}`.trim()
        : null,
      // Areas are represented by their centre.
      lokalizacja: el.type === "node" ? "dokladna" : "przyblizona",
      fakty,
      zrodla,
      pewnosc: wiki ? "wysoka" : "srednia",
      zrodlo_rekordu: "osm",
      tagi: [tag],
    },
  };
}

/** `pl:Ogród Saski w Warszawie` → `Ogród Saski w Warszawie`; other languages are skipped. */
export function wikiTitle(tag: string | undefined): string | null {
  return tag?.match(/^pl:(.+)$/)?.[1]?.trim() || null;
}

const WikiQuerySchema = z.object({
  query: z
    .object({
      normalized: z.array(z.object({ from: z.string(), to: z.string() })).optional(),
      redirects: z.array(z.object({ from: z.string(), to: z.string() })).optional(),
      pages: z.array(
        z.object({
          title: z.string(),
          missing: z.boolean().optional(),
          extract: z.string().optional(),
          fullurl: z.string().optional(),
        }),
      ),
    })
    .optional(),
});

/**
 * `action=query&prop=extracts|info&exintro&explaintext&redirects&formatversion=2` → the first lead
 * paragraph per requested title, following title normalisation and redirects.
 */
export function wikiLeadsFromQuery(body: unknown): Map<string, WikiSummary> {
  const query = WikiQuerySchema.parse(body).query;
  const leads = new Map<string, WikiSummary>();
  if (!query) return leads;
  const pages = new Map(query.pages.map((p) => [p.title, p]));
  const step = (map: { from: string; to: string }[] | undefined) =>
    new Map((map ?? []).map((m) => [m.from, m.to]));
  const normalized = step(query.normalized);
  const redirects = step(query.redirects);
  const requested = new Set([...normalized.keys(), ...redirects.keys(), ...pages.keys()]);
  for (const title of requested) {
    const norm = normalized.get(title) ?? title;
    const page = pages.get(redirects.get(norm) ?? norm);
    const extract = page?.extract
      ?.split("\n")
      .find((p) => p.trim())
      ?.trim();
    if (!page || page.missing || !extract) continue;
    leads.set(title, {
      title: page.title,
      extract,
      url: page.fullurl ?? `https://pl.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
    });
  }
  return leads;
}

const normalize = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/** Same name within `radiusM`: keep the first (callers put better elements first). */
export function dedupeByName<T extends { name: string; lat: number; lng: number }>(
  items: T[],
  radiusM = 500,
): T[] {
  const kept: T[] = [];
  for (const item of items) {
    const dup = kept.some(
      (k) => normalize(k.name) === normalize(item.name) && distanceM(k, item) < radiusM,
    );
    if (!dup) kept.push(item);
  }
  return kept;
}

function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = (a.lat - b.lat) * 111_320;
  const dLng = (a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}
