import { z } from "zod";
import { InterestSchema } from "../interests";
import { LatLngSchema } from "./common";

export const MIN_DURATION_MIN = 30;
export const MAX_DURATION_MIN = 240;

export const PlanRouteRequestSchema = z
  .object({
    origin: LatLngSchema,
    durationMin: z.number().int().min(MIN_DURATION_MIN).max(MAX_DURATION_MIN),
    interests: z.array(InterestSchema).min(1).max(5),
    /** Loop: the ride ends at a stop near the origin. */
    returnToStart: z.boolean().default(false),
    /** The ride ends at a stop near this point. Not together with `returnToStart`. */
    destination: LatLngSchema.optional(),
  })
  .refine((r) => !(r.returnToStart && r.destination), {
    message: "Podaj destination albo returnToStart, nie oba",
    path: ["destination"],
  });
/** What a client sends; `returnToStart` and `destination` may be left out. */
export type PlanRouteRequest = z.input<typeof PlanRouteRequestSchema>;

export const StopSchema = z.object({
  id: z.string(),
  name: z.string(),
  position: LatLngSchema,
});
export type Stop = z.infer<typeof StopSchema>;

export const LegSchema = z.object({
  line: z.string(),
  mode: z.enum(["tram", "bus"]),
  headsign: z.string(),
  fromStop: StopSchema,
  toStop: StopSchema,
  /** ISO 8601 */
  departAt: z.string(),
  /**
   * `departAt` is a real departure from the ZTM timetable (dane.um.warszawa.pl).
   * Missing: estimated as half the headway (no token, API down or no data for the stop).
   */
  realDeparture: z.boolean().optional(),
  durationMin: z.number().nonnegative(),
  /** Shape of the ride, [lng, lat] pairs for MapLibre. */
  lngLats: z.array(z.tuple([z.number(), z.number()])),
});
export type Leg = z.infer<typeof LegSchema>;

export const RoutePlaceSchema = z.object({
  placeId: z.string(),
  name: z.string(),
  position: LatLngSchema,
  /** Seconds from the start of the ride until the place is outside the window. */
  etaSec: z.number().nonnegative(),
  /** Seconds until the next place; how long the story may last. */
  windowSec: z.number().nonnegative(),
  legIndex: z.number().int().nonnegative(),
  distanceM: z.number().nonnegative(),
});
export type RoutePlace = z.infer<typeof RoutePlaceSchema>;

export const RouteSchema = z.object({
  id: z.string(),
  legs: z.array(LegSchema).min(1),
  places: z.array(RoutePlaceSchema),
  totalMin: z.number().nonnegative(),
  /** The last stop is near the origin. False when a requested loop could not be found. */
  endsAtStart: z.boolean(),
  /**
   * Only when a `destination` was requested: the last stop is near it.
   * False when no ride could reach it within the time.
   */
  endsAtDestination: z.boolean().optional(),
  /** Data credits that must be shown next to the route. */
  attribution: z.array(z.string()),
});
export type Route = z.infer<typeof RouteSchema>;
