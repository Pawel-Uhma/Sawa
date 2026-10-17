// Supabase RPC responses (snake_case, jsonb) → domain types. Pure; tested on real fixtures.

import { OptionalSubkindSchema } from "@sawa/shared";
import { z } from "zod";
import {
  PLACE_KINDS,
  type Place,
  type PlaceAlongLine,
  type PlaceSummary,
} from "../../domain/place";

const KindSchema = z.enum(PLACE_KINDS);

const FeatureCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(
    z.object({
      geometry: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
      properties: z.object({
        id: z.string(),
        name: z.string(),
        kind: KindSchema,
        subkind: OptionalSubkindSchema,
        interests: z.array(z.string()),
        richness: z.number(),
      }),
    }),
  ),
});

const NearLineRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: KindSchema,
  subkind: OptionalSubkindSchema,
  interests: z.array(z.string()),
  richness: z.number(),
  lat: z.number(),
  lng: z.number(),
  distance_m: z.number(),
  fraction: z.number(),
});

const PlaceDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  name_en: z.string().nullable(),
  kind: KindSchema,
  subkind: OptionalSubkindSchema,
  lat: z.number(),
  lng: z.number(),
  interests: z.array(z.string()),
  richness: z.number(),
  summary_en: z.string().nullable(),
  address_today: z.string().nullable(),
  address_historic: z.string().nullable(),
  period: z.string().nullable(),
  still_exists: z.boolean().nullable(),
  facts: z.array(z.string()),
  trivia: z.array(z.string()),
  people: z.array(z.object({ name: z.string(), role: z.string(), wikiUrl: z.string().optional() })),
  former_names: z.array(
    z.object({ name: z.string(), from: z.string().optional(), to: z.string().optional() }),
  ),
  sources: z.array(z.object({ id: z.string(), title: z.string(), url: z.string() })),
  unverified_facts: z.array(z.object({ text: z.string(), reason: z.string() })),
  confidence: z.enum(["high", "medium", "low"]).nullable(),
  location_precision: z.enum(["exact", "approx"]).nullable(),
  today_nearby: z.array(
    z.object({
      name: z.string(),
      type: z.string().nullable(),
      googleMapsUrl: z.string(),
      placeId: z.string(),
    }),
  ),
  photos: z.array(
    z.object({
      url: z.string(),
      page_url: z.string().nullable(),
      caption: z.string().nullable(),
      year: z.string().nullable(),
      author: z.string().nullable(),
      source: z.string().nullable(),
      license: z.string().nullable(),
    }),
  ),
});

export function toPlaceSummaries(data: unknown): PlaceSummary[] {
  return FeatureCollectionSchema.parse(data).features.map(({ geometry, properties }) => ({
    ...properties,
    // GeoJSON order is [lng, lat]
    position: { lat: geometry.coordinates[1], lng: geometry.coordinates[0] },
  }));
}

export function toPlacesAlongLine(data: unknown): PlaceAlongLine[] {
  return z
    .array(NearLineRowSchema)
    .parse(data)
    .map(({ lat, lng, distance_m, ...rest }) => ({
      ...rest,
      position: { lat, lng },
      distanceM: distance_m,
    }));
}

export function toPlace(data: unknown): Place | null {
  if (data === null) return null;
  const p = PlaceDetailSchema.parse(data);
  return {
    id: p.id,
    name: p.name,
    kind: p.kind,
    subkind: p.subkind,
    interests: p.interests,
    position: { lat: p.lat, lng: p.lng },
    richness: p.richness,
    nameEn: p.name_en,
    summaryEn: p.summary_en,
    addressToday: p.address_today,
    addressHistoric: p.address_historic,
    period: p.period,
    stillExists: p.still_exists,
    facts: p.facts,
    trivia: p.trivia,
    people: p.people,
    formerNames: p.former_names,
    sources: p.sources,
    unverifiedFacts: p.unverified_facts,
    confidence: p.confidence,
    locationPrecision: p.location_precision,
    todayNearby: p.today_nearby,
    photos: p.photos.map(({ page_url, ...photo }) => ({ ...photo, pageUrl: page_url })),
  };
}
