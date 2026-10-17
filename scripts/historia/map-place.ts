// Anti-corruption layer: GeoJSON from docs/historia (Polish keys) → rows of public.places
// and public.place_photos. Pure functions, no IO.

import { z } from "zod";
import { assignInterests, type Interest } from "./interests";

const SourceSchema = z.object({ tytul: z.string(), url: z.string() });
const PersonSchema = z.object({ kto: z.string(), rola: z.string(), wiki: z.string().nullish() });
const PhotoSchema = z.object({
  url_pliku: z.string().optional(),
  url: z.string().optional(),
  opis: z.string().nullish(),
  rok: z.string().nullish(),
  autor: z.string().nullish(),
  zrodlo: z.string().nullish(),
  zrodla: z.string().nullish(),
  licencja: z.string().nullish(),
});
const HistoricNameSchema = z.object({ nazwa: z.string(), od: z.string(), do: z.string() });
const UnverifiedSchema = z.object({ tekst: z.string(), brak_w_zrodle: z.array(z.string()) });

const PropertiesSchema = z.looseObject({
  id: z.string().min(1),
  nazwa: z.string().min(1),
  name_en: z.string().nullish(),
  typ: z.string(),
  adres_dzis: z.string().nullish(),
  adres_historyczny: z.string().nullish(),
  lokalizacja: z.string().nullish(),
  okres: z.string().nullish(),
  istnieje: z.boolean().nullish(),
  summary_en: z.string().nullish(),
  fakty: z.array(z.string()).default([]),
  ciekawostki: z.array(z.string()).nullish(),
  ludzie: z.array(PersonSchema).nullish(),
  dawne_nazwy: z.array(z.string()).nullish(),
  nazwy_historyczne: z.array(HistoricNameSchema).nullish(),
  zdjecia: z.array(PhotoSchema).nullish(),
  zrodla: z.array(SourceSchema).default([]),
  pewnosc: z.string().nullish(),
  uwagi: z.string().nullish(),
  do_weryfikacji: z.array(UnverifiedSchema).nullish(),
  zrodlo_rekordu: z.string().nullish(),
});

export const FeatureSchema = z.object({
  type: z.literal("Feature"),
  geometry: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([z.number(), z.number()]),
  }),
  properties: PropertiesSchema,
});

export type HistoriaFeature = z.infer<typeof FeatureSchema>;

const KIND: Record<string, string> = {
  budynek: "building",
  pomnik: "monument",
  tablica: "plaque",
  ulica: "street",
  miejsce: "site",
  mural: "mural",
  zdarzenie: "event",
  swiatynia: "church",
  cmentarz: "cemetery",
};

const CONFIDENCE: Record<string, string> = { wysoka: "high", srednia: "medium", niska: "low" };
const PRECISION: Record<string, string> = { dokladna: "exact", przyblizona: "approx" };

export type PlaceRow = {
  id: string;
  name: string;
  name_en: string | null;
  kind: string;
  geom: string; // EWKT
  address_today: string | null;
  address_historic: string | null;
  period: string | null;
  still_exists: boolean | null;
  summary_en: string | null;
  facts: string[];
  trivia: string[];
  people: { name: string; role: string; wikiUrl?: string }[];
  former_names: { name: string; from?: string; to?: string }[];
  sources: { id: string; title: string; url: string }[];
  unverified_facts: { text: string; reason: string }[];
  interests: Interest[];
  confidence: string | null;
  location_precision: string | null;
  origin: string;
  richness: number;
  notes: string | null;
  raw: Record<string, unknown>;
  updated_at: string;
};

export type PhotoRow = {
  place_id: string;
  url: string;
  page_url: string | null;
  caption: string | null;
  year: string | null;
  author: string | null;
  source: string | null;
  license: string | null;
};

export function mapPlace(feature: HistoriaFeature, now: Date): PlaceRow {
  const p = feature.properties;
  const [lng, lat] = feature.geometry.coordinates;
  const kind = KIND[p.typ];
  if (!kind) throw new Error(`Unknown typ "${p.typ}" in ${p.id}`);

  const trivia = p.ciekawostki ?? [];
  const people = (p.ludzie ?? []).map((x) => ({
    name: x.kto,
    role: x.rola,
    ...(x.wiki ? { wikiUrl: x.wiki } : {}),
  }));

  return {
    id: p.id,
    name: p.nazwa,
    name_en: p.name_en ?? null,
    kind,
    geom: `SRID=4326;POINT(${lng} ${lat})`,
    address_today: p.adres_dzis ?? null,
    address_historic: p.adres_historyczny ?? null,
    period: p.okres ?? null,
    still_exists: p.istnieje ?? null,
    summary_en: p.summary_en ?? null,
    facts: p.fakty,
    trivia,
    people,
    former_names: [
      ...(p.dawne_nazwy ?? []).map((name) => ({ name })),
      ...(p.nazwy_historyczne ?? []).map((x) => ({ name: x.nazwa, from: x.od, to: x.do })),
    ],
    sources: p.zrodla.map((s, i) => ({ id: `s${i + 1}`, title: s.tytul, url: s.url })),
    unverified_facts: (p.do_weryfikacji ?? []).map((x) => ({
      text: x.tekst,
      reason: `years not found in source: ${x.brak_w_zrodle.join(", ")}`,
    })),
    interests: assignInterests({
      kind,
      text: [p.nazwa, ...p.fakty, ...trivia].join(" "),
      hasPeople: people.length > 0,
    }),
    confidence: (p.pewnosc && CONFIDENCE[p.pewnosc]) ?? null,
    location_precision: (p.lokalizacja && PRECISION[p.lokalizacja]) ?? null,
    origin: p.zrodlo_rekordu ?? "curated",
    richness: p.fakty.length + trivia.length,
    notes: p.uwagi ?? null,
    raw: p,
    updated_at: now.toISOString(),
  };
}

// Licences are ignored for now (internal use, T-22); the licence text is kept as given.
export function mapPhotos(feature: HistoriaFeature): PhotoRow[] {
  const placeId = feature.properties.id;
  const seen = new Set<string>();
  const rows: PhotoRow[] = [];
  for (const z of feature.properties.zdjecia ?? []) {
    const url = z.url_pliku ?? z.url;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    rows.push({
      place_id: placeId,
      url,
      page_url: z.url_pliku ? (z.url ?? null) : url,
      caption: z.opis ?? null,
      year: z.rok ?? null,
      author: z.autor ?? null,
      source: z.zrodlo ?? z.zrodla ?? null,
      license: z.licencja ?? null,
    });
  }
  return rows;
}
