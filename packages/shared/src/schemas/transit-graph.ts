import { z } from "zod";

/**
 * Compact tram + bus network for one service day, built from the Warsaw GTFS by
 * scripts/transit/build-graph.ts and read by the API (apps/api/data/transit-graph.json.gz).
 */
export const TransitGraphSchema = z.object({
  version: z.literal(1),
  serviceDate: z.string(),
  generatedAt: z.string(),
  attribution: z.array(z.string()),
  stops: z.array(
    z.object({
      id: z.string(),
      groupId: z.string(),
      name: z.string(),
      lat: z.number(),
      lng: z.number(),
    }),
  ),
  patterns: z.array(
    z.object({
      id: z.string(),
      line: z.string(),
      mode: z.enum(["tram", "bus"]),
      headsign: z.string(),
      headwaySec: z.number().positive(),
      /** [stopId, atSec, alongM] */
      stops: z.array(z.tuple([z.string(), z.number(), z.number()])).min(2),
      lngLats: z.array(z.tuple([z.number(), z.number()])).min(2),
    }),
  ),
});
export type TransitGraph = z.infer<typeof TransitGraphSchema>;
