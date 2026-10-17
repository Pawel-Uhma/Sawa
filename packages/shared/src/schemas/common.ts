import { z } from "zod";

export const LatLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type LatLng = z.infer<typeof LatLngSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const HealthSchema = z.object({
  ok: z.literal(true),
  version: z.string(),
  /** Service day of the transit graph (GTFS snapshot), YYYY-MM-DD. */
  transitDate: z.string().optional(),
  /** False when the graph is for another day than today in Warsaw: rebuild it (T-18). */
  transitIsToday: z.boolean().optional(),
});
export type Health = z.infer<typeof HealthSchema>;
