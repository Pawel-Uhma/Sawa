import { z } from "zod";
import { InterestSchema } from "../interests";
import { MAX_HEARD_PLACES } from "../memory";
import { LatLngSchema } from "./common";

/** Rides under 30 min may be a walk (`Leg.mode` "walk"); see docs/12-plan-mvp.md §7. */
export const MIN_DURATION_MIN = 5;
export const MAX_DURATION_MIN = 240;

/** A story never runs longer than the longest window the planner gives (docs/12-plan-mvp.md §8). */
export const MAX_STORY_SEC = 600;

/** Onboarding answers (keys as in apps/web `lib/onboarding.ts`). */
export const FAMILIARITY = ["first_time", "know_a_bit", "local"] as const;
export type Familiarity = (typeof FAMILIARITY)[number];
export const STORY_STYLES = ["fun", "deep", "trivia"] as const;
export type StoryStyle = (typeof STORY_STYLES)[number];

export const PlanRouteRequestSchema = z
  .object({
    origin: LatLngSchema,
    /**
     * How long the ride should take. Left out with a `destination`: the fastest way there
     * (the client can show it first and use its `totalMin` as the shortest choice).
     */
    durationMin: z.number().int().min(MIN_DURATION_MIN).max(MAX_DURATION_MIN).optional(),
    interests: z.array(InterestSchema).min(1).max(5),
    /** Loop: the ride ends at a stop near the origin. */
    returnToStart: z.boolean().default(false),
    /** The ride ends at a stop near this point. Not together with `returnToStart`. */
    destination: LatLngSchema.optional(),
    /** How well the user knows Warsaw: first-timers get the richest places first. */
    familiarity: z.enum(FAMILIARITY).optional(),
    /** How Sawa tells stories: sets the shortest time between two places. */
    storyStyle: z.enum(STORY_STYLES).optional(),
    /**
     * What the listener already heard: place id → number of its facts told (apps/web memory).
     * Places told in full count much less, so with time rides go to less obvious places.
     */
    heard: z
      .record(z.string(), z.number().int().nonnegative())
      .refine((h) => Object.keys(h).length <= MAX_HEARD_PLACES, "heard: too many places")
      .optional(),
  })
  .refine((r) => !(r.returnToStart && r.destination), {
    message: "Podaj destination albo returnToStart, nie oba",
    path: ["destination"],
  })
  .refine((r) => r.durationMin !== undefined || r.destination !== undefined, {
    message: "Podaj durationMin albo destination (najszybsza trasa do celu)",
    path: ["durationMin"],
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
  /** Empty for a walk. */
  line: z.string(),
  /**
   * "walk": on foot (to the first stop, from the last one, or a whole walk), along streets and
   * footways; straight segments when the walking router is unavailable.
   */
  mode: z.enum(["tram", "bus", "walk"]),
  /** Direction of the line, or where a walk ends. */
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
  /**
   * Live: by its reported position, the vehicle to board is this many seconds late (negative:
   * early); `departAt` and the legs after it already include it. Missing: no live estimate.
   */
  delaySec: z.number().int().optional(),
  durationMin: z.number().nonnegative(),
  /** Shape of the ride or walk, [lng, lat] pairs for MapLibre. */
  lngLats: z.array(z.tuple([z.number(), z.number()])),
});
export type Leg = z.infer<typeof LegSchema>;

export const RoutePlaceSchema = z.object({
  placeId: z.string(),
  name: z.string(),
  position: LatLngSchema,
  /** Seconds from the start of the ride until the place is outside the window. */
  etaSec: z.number().nonnegative(),
  /**
   * How long the story may last: seconds until the next place, at least the story style's
   * minimum gap (also for the last place) and at most its maximum (≤ MAX_STORY_SEC).
   */
  windowSec: z.number().nonnegative().max(MAX_STORY_SEC),
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
