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
const GENERIC_NAME = /^(boisko [a-z0-9]$|budynek|hala piłkarska$|siłownia miejska$)/i;

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
export function osmTag({ tags }: OsmElement): PlaceTag | null {
  const name = tags.name;
  const leisure = tags.leisure ?? "";
  if (!name || GENERIC_NAME.test(name)) return null;
  if (GREEN.includes(leisure)) return "nature";
  if (SPORT_GROUNDS.includes(leisure)) return "sport";
  if (leisure === "sports_centre") {
    const sports = (tags.sport ?? "").split(";");
    return INSTITUTION.test(name) || sports.some((s) => PUBLIC_SPORTS.includes(s)) ? "sport" : null;
  }
  return null;
}

export function mapOsmElement(el: OsmElement, tag: PlaceTag, wiki?: WikiSummary) {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat === undefined || lng === undefined) return null;

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
