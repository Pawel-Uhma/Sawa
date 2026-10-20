import { z } from "zod";
import { LatLngSchema } from "./common";

/** A Veturilo station (Nextbike GBFS for Warsaw) with what it has right now (#192). */
export const BikeStationSchema = z.object({
  id: z.string(),
  name: z.string(),
  position: LatLngSchema,
  /** Bikes ready to rent. */
  bikesAvailable: z.number().int().nonnegative(),
  /** Free docks to leave a bike at. */
  docksAvailable: z.number().int().nonnegative(),
  capacity: z.number().int().nonnegative().optional(),
});
export type BikeStation = z.infer<typeof BikeStationSchema>;

/** `GET /v1/bike-stations`: every station; `stale` when the feed failed and older counts are served. */
export const BikeStationsResponseSchema = z.object({
  stations: z.array(BikeStationSchema),
  stale: z.boolean().optional(),
  attribution: z.array(z.string()),
});
export type BikeStationsResponse = z.infer<typeof BikeStationsResponseSchema>;
