import { z } from "zod";
import { InterestSchema } from "../interests";
import { LatLngSchema } from "./common";

/** Properties returned by the Supabase RPC `places_in_bbox` (supabase/migrations/*_places_rpc.sql). */
export const PlaceSummaryPropertiesSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.string(),
  interests: z.array(z.string()),
  richness: z.number().int().nonnegative(),
});
export type PlaceSummaryProperties = z.infer<typeof PlaceSummaryPropertiesSchema>;

export const PlaceSummaryFeatureSchema = z.object({
  type: z.literal("Feature"),
  geometry: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([z.number(), z.number()]), // [lng, lat]
  }),
  properties: PlaceSummaryPropertiesSchema,
});
export type PlaceSummaryFeature = z.infer<typeof PlaceSummaryFeatureSchema>;

/** Same shape as `places_in_bbox`; features are validated one by one by consumers. */
export const PlaceSummaryCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(z.unknown()),
});

/** Response of `GET /v1/places`: a MapLibre-ready source with validated features. */
export const PlacesResponseSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(PlaceSummaryFeatureSchema),
});
export type PlacesResponse = z.infer<typeof PlacesResponseSchema>;

const csv = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

/** Query of `GET /v1/places`: `?bbox=minLng,minLat,maxLng,maxLat&interests=historical,cultural` (categories, not place tags). */
export const PlacesQuerySchema = z.object({
  bbox: z
    .string()
    .transform((s) => csv(s).map(Number))
    .pipe(z.array(z.number()).length(4))
    .transform(([minLng, minLat, maxLng, maxLat]) => ({ minLng, minLat, maxLng, maxLat }))
    .refine((b) => b.minLng < b.maxLng && b.minLat < b.maxLat, "bbox: min must be below max"),
  interests: z.string().transform(csv).pipe(z.array(InterestSchema)).optional(),
});
export type PlacesQuery = z.infer<typeof PlacesQuerySchema>;

export const PLACE_KINDS = [
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
export const PlaceKindSchema = z.enum(PLACE_KINDS);
export type PlaceKind = z.infer<typeof PlaceKindSchema>;

export const PlaceSourceSchema = z.object({
  /** "s1", "s2", ...: the story cites these ids. */
  id: z.string(),
  title: z.string(),
  url: z.string(),
});
export type PlaceSource = z.infer<typeof PlaceSourceSchema>;

export const PlacePhotoSchema = z.object({
  url: z.string(),
  pageUrl: z.string().nullable(),
  caption: z.string().nullable(),
  year: z.string().nullable(),
  author: z.string().nullable(),
  source: z.string().nullable(),
  license: z.string().nullable(),
});
export type PlacePhoto = z.infer<typeof PlacePhotoSchema>;

/**
 * What stands at the place today (within 25 m), from Google Places downloaded on 15–16.10.2026.
 * Never queried live. Show "Google Maps" as the source next to it.
 */
export const TodayNearbySchema = z.object({
  name: z.string(),
  type: z.string().nullable(),
  googleMapsUrl: z.string(),
  placeId: z.string(),
});
export type TodayNearby = z.infer<typeof TodayNearbySchema>;

/** Response of `GET /v1/places/:id`: everything the story and a place card need. */
export const PlaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: PlaceKindSchema,
  interests: z.array(z.string()),
  position: LatLngSchema,
  richness: z.number().int().nonnegative(),
  nameEn: z.string().nullable(),
  summaryEn: z.string().nullable(),
  addressToday: z.string().nullable(),
  addressHistoric: z.string().nullable(),
  period: z.string().nullable(),
  stillExists: z.boolean().nullable(),
  facts: z.array(z.string()),
  trivia: z.array(z.string()),
  people: z.array(z.object({ name: z.string(), role: z.string(), wikiUrl: z.string().optional() })),
  formerNames: z.array(
    z.object({ name: z.string(), from: z.string().optional(), to: z.string().optional() }),
  ),
  sources: z.array(PlaceSourceSchema),
  /** Facts whose years were not found in the source; keep them out of the story. */
  unverifiedFacts: z.array(z.object({ text: z.string(), reason: z.string() })),
  confidence: z.enum(["high", "medium", "low"]).nullable(),
  locationPrecision: z.enum(["exact", "approx"]).nullable(),
  photos: z.array(PlacePhotoSchema),
  todayNearby: z.array(TodayNearbySchema),
});
export type Place = z.infer<typeof PlaceSchema>;
