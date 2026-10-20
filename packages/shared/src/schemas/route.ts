import { z } from "zod";
import { InterestSchema } from "../interests";
import { MAX_HEARD_PLACES } from "../memory";
import { BikeStationSchema } from "./bike-station";
import { LatLngSchema } from "./common";

/** Rides under 30 min may be a walk (`Leg.mode` "walk"); see docs/12-plan-mvp.md §7. */
export const MIN_DURATION_MIN = 5;
export const MAX_DURATION_MIN = 240;

/** A story never runs longer than the longest window the planner gives (docs/12-plan-mvp.md §8). */
export const MAX_STORY_SEC = 600;

/** Most different routes one plan proposes (#197); without `routeCount` the planner gives 3. */
export const MAX_ROUTE_COUNT = 5;
export const DEFAULT_ROUTE_COUNT = 3;
/** Most places a "Losuj inną" may ask to skip (all places of the routes shown so far). */
export const MAX_EXCLUDED_PLACES = 200;

/** Onboarding answers (keys as in apps/web `lib/onboarding.ts`). */
export const FAMILIARITY = ["first_time", "know_a_bit", "local"] as const;
export type Familiarity = (typeof FAMILIARITY)[number];
export const STORY_STYLES = ["fun", "deep", "trivia"] as const;
export type StoryStyle = (typeof STORY_STYLES)[number];
/**
 * "walk": spacer po miejscach; "transit": przejażdżka tramwajem i autobusem; "bike": rowerem
 * (Veturilo, gdy jest stacja w pobliżu, #191, #192); "car": samochodem, tylko głos (#190).
 */
export const TRAVEL = ["walk", "transit", "bike", "car"] as const;
export type Travel = (typeof TRAVEL)[number];

/** On a bike: one's own, or Veturilo (walk to a station, ride, leave it at a station with a dock). */
export const BIKES = ["own", "veturilo"] as const;
export type Bike = (typeof BIKES)[number];
/** Who listens: "kids" (about 6–12 years) get simpler, shorter stories (issue #65). */
export const AUDIENCES = ["adult", "kids"] as const;
export type Audience = (typeof AUDIENCES)[number];

/** Most stops on the way (issue #195); each one adds a planned part of the route. */
export const MAX_WAYPOINTS = 5;

/**
 * A stop on the way: the route passes through it, in the order given. With `placeId` (a place
 * from /v1/places) Sawa tells its story there, like at the other places of the route.
 */
export const WaypointSchema = LatLngSchema.extend({
  placeId: z.string().optional(),
  /** Shown on the route at the stop (the client knows the place's name). */
  name: z.string().max(200).optional(),
});
export type Waypoint = z.infer<typeof WaypointSchema>;

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
    /**
     * Stops on the way, passed in this order before the end. `durationMin` includes the way
     * through them; the time left goes to the last part (to the destination, start or anywhere).
     */
    waypoints: z.array(WaypointSchema).max(MAX_WAYPOINTS).optional(),
    /** How well the user knows Warsaw: first-timers get the richest places first. */
    familiarity: z.enum(FAMILIARITY).optional(),
    /** How Sawa tells stories: sets the shortest time between two places. */
    storyStyle: z.enum(STORY_STYLES).optional(),
    /** Who listens; missing means "adult". "kids": the planner leans to nature and sports (#65). */
    audience: z.enum(AUDIENCES).optional(),
    /**
     * Walk, transit, bike or car, as the user picked. Without it the planner walks only under
     * 30 min and takes a walk when it scores better than a ride (never bike or car).
     */
    travel: z.enum(TRAVEL).optional(),
    /**
     * With `travel: "bike"`: "own" never goes through Veturilo; "veturilo" (and missing, as
     * before) takes a Veturilo bike when a station with bikes is near, else one's own.
     */
    bike: z.enum(BIKES).optional(),
    /**
     * What the listener already heard: place id → number of its facts told (apps/web memory).
     * Places told in full count much less, so with time rides go to less obvious places.
     */
    heard: z
      .record(z.string(), z.number().int().nonnegative())
      .refine((h) => Object.keys(h).length <= MAX_HEARD_PLACES, "heard: too many places")
      .optional(),
    /**
     * How many different routes to propose: the route itself plus up to `routeCount - 1`
     * `alternatives` (#197). 1 asks for just the route. Default `DEFAULT_ROUTE_COUNT`.
     */
    routeCount: z.number().int().min(1).max(MAX_ROUTE_COUNT).optional(),
    /** "Losuj inną": another seed gives other routes; the same seed gives the same ones. */
    seed: z.number().int().nonnegative().max(2_147_483_647).optional(),
    /** Places the routes should not pass (e.g. those of the routes already shown). */
    excludePlaceIds: z.array(z.string()).max(MAX_EXCLUDED_PLACES).optional(),
  })
  .refine((r) => !(r.returnToStart && r.destination), {
    message: "Podaj destination albo returnToStart, nie oba",
    path: ["destination"],
  })
  .refine(
    (r) => r.durationMin !== undefined || r.destination !== undefined || !!r.waypoints?.length,
    {
      message: "Podaj durationMin albo destination (najszybsza trasa do celu)",
      path: ["durationMin"],
    },
  );
/** What a client sends; `returnToStart` and `destination` may be left out. */
export type PlanRouteRequest = z.input<typeof PlanRouteRequestSchema>;

export const StopSchema = z.object({
  id: z.string(),
  name: z.string(),
  position: LatLngSchema,
});
export type Stop = z.infer<typeof StopSchema>;

/** A stop passed on a ride, with when the vehicle is there (ISO 8601, same clock as `departAt`). */
export const PassedStopSchema = StopSchema.extend({ at: z.string() });
export type PassedStop = z.infer<typeof PassedStopSchema>;

export const LegSchema = z.object({
  /** Empty for a walk. */
  line: z.string(),
  /**
   * "walk": on foot (to the first stop, from the last one, or a whole walk), along streets and
   * footways; straight segments when the walking router is unavailable. "bike": by bike
   * (a Veturilo bike between two stations, or one's own), "car": driving; both along roads
   * from a router or straight segments.
   */
  mode: z.enum(["tram", "bus", "walk", "bike", "car"]),
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
  /**
   * Stops the ride passes between `fromStop` and `toStop`, in order and without them, so the
   * client can list the way and where to get off. Missing for a walk (and in older answers).
   */
  stops: z.array(PassedStopSchema).optional(),
  /** Shape of the ride or walk, [lng, lat] pairs for MapLibre. */
  lngLats: z.array(z.tuple([z.number(), z.number()])),
});
export type Leg = z.infer<typeof LegSchema>;

/** A tram or bus leg: a ZTM line with a number, stops and departures (not a walk, bike or car). */
export function isTransitMode(mode: Leg["mode"]): mode is "tram" | "bus" {
  return mode === "tram" || mode === "bus";
}

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

const RouteBaseSchema = z.object({
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
  /**
   * A bike route on Veturilo: where the bike is taken (with bikes) and left (with free docks),
   * as counted when planned. Missing without a nearby station (one's own bike).
   */
  bikeStations: z
    .object({ pickup: BikeStationSchema, dropoff: BikeStationSchema.optional() })
    .optional(),
});

export const RouteSchema = RouteBaseSchema.extend({
  /**
   * Other routes for the same request, as different from this one and from each other as the
   * planner found (`routeCount`, #197). Missing for a walk, the fastest way and older answers.
   */
  alternatives: z.array(RouteBaseSchema).optional(),
});
export type Route = z.infer<typeof RouteSchema>;
