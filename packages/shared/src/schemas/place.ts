import { z } from "zod";

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
