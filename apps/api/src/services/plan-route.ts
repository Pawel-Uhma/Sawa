import {
  fromLngLat,
  haversineM,
  type LatLng,
  type PlanRouteRequest,
  type Route,
} from "@sawa/shared";
import type { BBox, PlaceSummary } from "../domain/place";
import { applyDepartures } from "../domain/routing/apply-departures";
import { DEFAULT_SEARCH_OPTIONS, planRide, type Ride } from "../domain/routing/beam-search";
import {
  type AlongPathsInput,
  alongWalkPaths,
  buildRoute,
  buildWalkRoute,
  scoreAlongPath,
} from "../domain/routing/build-route";
import { DEFAULT_FASTEST_OPTIONS, planFastest } from "../domain/routing/fastest";
import { cumulativeDistancesM } from "../domain/routing/geometry";
import { computePlaceHits } from "../domain/routing/place-hits";
import { RICHNESS_EXPONENT, type ScorePrefs } from "../domain/routing/score";
import { STORY_GAP_SEC, STORY_MAX_SEC } from "../domain/routing/select-stories";
import { shiftRide } from "../domain/routing/shift-ride";
import { toPlacePoints } from "../domain/routing/to-place-points";
import type { PlaceHit, PlacePoint } from "../domain/routing/types";
import {
  DEFAULT_WALK_OPTIONS,
  isLoop,
  LOOP_TIME_SLACK,
  loopObjective,
  placesAlong,
  planSquareLoop,
  planSquareLoops,
  planWalk,
  polylineM,
  resizeLoop,
  squareness,
  type Walk,
  type WalkInput,
} from "../domain/routing/walk-tour";
import { AppError } from "../lib/errors";
import type {
  DepartureSource,
  LiveBoardingSource,
  PlacesRepository,
  TransitCalendar,
  TransitData,
  WalkPathSource,
} from "./ports";
import { transitOn } from "./transit-day";

const M_PER_DEG_LAT = 111_320;
const GRID_DEG = 0.05; // bbox snapped to a grid so nearby requests share the cache
/** Below this duration a walk may be planned instead of a ride. */
const WALK_UNDER_MIN = 30;
/** Live delays outside this range are ignored (likely the wrong vehicle or a stale position). */
const MAX_LIVE_DELAY_SEC = 20 * 60;
/** Smaller differences are noise of the position-based estimate. */
const MIN_LIVE_DELAY_SEC = 30;
const CITY_TRANSIT_CREDIT =
  "Rozkład jazdy i pozycje pojazdów: Zarząd Transportu Miejskiego, dane.um.warszawa.pl (CC BY)";
const CACHE_SIZE = 20;
/** Places come from Supabase; refetched this often so new places reach routes without a restart. */
const PLACES_TTL_MS = 10 * 60_000;
/** After a failed fetch (fallback in use) Supabase is retried sooner. */
const RETRY_TTL_MS = 60_000;
/** A loop walk's measured detour factor is kept within these (a bad path should not shrink it). */
const LOOP_DETOUR_MIN = 1;
const LOOP_DETOUR_MAX = 2;
/** A loop walk's real path this close (share) to the budget is not planned again. */
const LOOP_PATH_SLACK = LOOP_TIME_SLACK;
/** Most times a loop walk is planned again with the detour measured on its path. */
const LOOP_REPLANS = 2;
/** Different loops measured on real paths at first (requests to the walk router at once). */
const LOOP_CANDIDATES = 3;
/** A tram covers ~15 km/h on average; a ride rarely gets farther than this from the origin. */
const reachKm = (durationMin: number) => Math.min(20, Math.max(4, durationMin * 0.15));

export type RoutePlanner = {
  plan(request: PlanRouteRequest, now: Date): Promise<Route>;
};

type PlacesSource = Pick<PlacesRepository, "listInBBox">;

type Prepared = {
  hitsByPattern: Map<string, PlaceHit[]>;
  placesById: Map<string, PlacePoint>;
  /** Identifies the place set, so an unchanged refetch keeps the computed hits. */
  fingerprint: string;
};

type CacheEntry = { prepared: Promise<Prepared>; expiresAt: number; isRefreshing: boolean };

/** Structural subset of pino, so the service does not depend on the logger library. */
export type PlannerLogger = {
  info(obj: object, msg: string): void;
  warn(obj: object, msg: string): void;
};

/** Around the origin and, if given, the destination. */
function reachableBbox(points: LatLng[], durationMin: number): BBox {
  const km = reachKm(durationMin);
  const dLat = (km * 1000) / M_PER_DEG_LAT;
  const lats = points.map((p) => p.lat);
  const dLng = dLat / Math.cos((Math.max(...lats.map(Math.abs)) * Math.PI) / 180);
  const lngs = points.map((p) => p.lng);
  const down = (v: number) => Math.floor(v / GRID_DEG) * GRID_DEG;
  const up = (v: number) => Math.ceil(v / GRID_DEG) * GRID_DEG;
  return {
    minLng: down(Math.min(...lngs) - dLng),
    minLat: down(Math.min(...lats) - dLat),
    maxLng: up(Math.max(...lngs) + dLng),
    maxLat: up(Math.max(...lats) + dLat),
  };
}

type PlannerDeps = {
  /** One service day (tests) or the calendar of built days (production). */
  transit: TransitData | TransitCalendar;
  /** Supabase in production; the file repository when Supabase is not configured. */
  places: PlacesSource;
  /** Used when `places` fails or times out (apps/api/data/places.geojson). */
  fallbackPlaces?: PlacesSource;
  departures?: DepartureSource;
  /** Live delay of the first vehicle to board, from ZTM positions. */
  live?: LiveBoardingSource;
  /** Walking legs follow streets and footways; without it (or when it fails) straight lines. */
  walkPaths?: WalkPathSource;
  logger?: PlannerLogger;
  /** Milliseconds; for the cache TTL. */
  clock?: () => number;
};

/** Plans on the graph of the request's Warsaw day; the planner of the previous day is dropped. */
export function createRoutePlanner(deps: PlannerDeps): RoutePlanner {
  let current: { serviceDate: string; planner: RoutePlanner } | undefined;
  return {
    plan(request, now) {
      const transit = transitOn(deps.transit, now);
      if (current?.serviceDate !== transit.serviceDate)
        current = {
          serviceDate: transit.serviceDate,
          planner: createDayPlanner({ ...deps, transit }),
        };
      return current.planner.plan(request, now);
    },
  };
}

function createDayPlanner(deps: PlannerDeps & { transit: TransitData }): RoutePlanner {
  const { network, attribution } = deps.transit;
  const clock = deps.clock ?? Date.now;
  const cache = new Map<string, CacheEntry>();

  async function fetchPlaces(
    bbox: BBox,
  ): Promise<{ summaries: PlaceSummary[]; isFallback: boolean }> {
    try {
      return { summaries: await deps.places.listInBBox(bbox), isFallback: false };
    } catch (err) {
      if (!deps.fallbackPlaces) throw err;
      deps.logger?.warn({ err, bbox }, "places source failed, planner uses the fallback file");
      return { summaries: await deps.fallbackPlaces.listInBBox(bbox), isFallback: true };
    }
  }

  async function load(bbox: BBox, previous?: Prepared) {
    const { summaries, isFallback } = await fetchPlaces(bbox);
    const fingerprint = fingerprintOf(summaries);
    if (previous?.fingerprint === fingerprint) return { prepared: previous, isFallback };
    const places = toPlacePoints(summaries);
    const prepared: Prepared = {
      hitsByPattern: computePlaceHits(network, places),
      placesById: new Map(places.map((p) => [p.id, p])),
      fingerprint,
    };
    deps.logger?.info({ bbox, places: places.length, isFallback }, "planner places loaded");
    return { prepared, isFallback };
  }

  const ttl = (isFallback: boolean) => clock() + (isFallback ? RETRY_TTL_MS : PLACES_TTL_MS);

  /** Stale entries keep serving while one background refetch runs, so a plan never waits on it. */
  function refresh(entry: CacheEntry, bbox: BBox) {
    entry.isRefreshing = true;
    entry.prepared
      .then((previous) => load(bbox, previous))
      .then(({ prepared, isFallback }) => {
        entry.prepared = Promise.resolve(prepared);
        entry.expiresAt = ttl(isFallback);
      })
      .catch((err) => {
        deps.logger?.warn({ err, bbox }, "planner places refresh failed, keeping the old ones");
        entry.expiresAt = ttl(true);
      })
      .finally(() => {
        entry.isRefreshing = false;
      });
  }

  function prepare(bbox: BBox): Promise<Prepared> {
    const key = `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`;
    const cached = cache.get(key);
    if (cached) {
      if (clock() >= cached.expiresAt && !cached.isRefreshing) refresh(cached, bbox);
      return cached.prepared;
    }

    const loading = load(bbox);
    const entry: CacheEntry = {
      prepared: loading.then((r) => r.prepared),
      expiresAt: Number.POSITIVE_INFINITY,
      isRefreshing: false,
    };
    loading.then(
      ({ isFallback }) => {
        entry.expiresAt = ttl(isFallback);
      },
      () => cache.delete(key),
    );
    cache.set(key, entry);
    if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value as string);
    return entry.prepared;
  }

  /** Where the ride boards first (end of the walk from the origin). */
  function rideStartStop(ride: Ride): LatLng | undefined {
    const first = ride.legs[0];
    const stop = first && network.patterns.get(first.patternId)?.stops[first.boardIndex];
    return stop && network.stops.get(stop.stopId)?.position;
  }

  /** Places passed on the walk from the origin to the first stop (stories before boarding). */
  function walkInPlacesOf(
    ride: Ride,
    origin: LatLng,
    interests: ReadonlySet<string>,
    prefs: ScorePrefs,
    placesById: Map<string, PlacePoint>,
  ) {
    const firstStop = rideStartStop(ride);
    return firstStop
      ? placesAlong(
          placesById.values(),
          { from: origin, to: firstStop, startSec: 0, sec: ride.walkSec },
          { interests, prefs, skip: new Set(ride.places.map((p) => p.placeId)) },
        )
      : [];
  }

  /**
   * Real times for the ride: each leg on a departure from the ZTM timetable, then the first
   * vehicle's live delay from its position (the GTFS graph is a snapshot of one day with
   * median times; only these two know about today and about traffic). The legs after it are
   * put back on the timetable from the new arrival.
   */
  async function withTimes(ride: Ride, now: Date): Promise<Ride> {
    const source = deps.departures;
    const transferSec = DEFAULT_SEARCH_OPTIONS.transferSec;
    // All legs at once; applyDepartures then picks the right one for each in order.
    const perLeg = source
      ? await Promise.all(
          ride.legs.map(async (leg) => {
            const pattern = network.patterns.get(leg.patternId);
            const stop = pattern?.stops[leg.boardIndex];
            if (!pattern || !stop) return undefined;
            const times = await source.departures(stop.stopId, pattern.line, now);
            return times?.map((d) => (d.getTime() - now.getTime()) / 1000);
          }),
        )
      : [];
    const timed = applyDepartures(ride, perLeg, transferSec);

    const delaySec = await liveDelaySec(timed, now);
    if (delaySec === undefined) return timed;
    const shifted = shiftRide(timed, delaySec, 0);
    const late: Ride = {
      ...shifted,
      legs: shifted.legs.map((l, i) => (i === 0 ? { ...l, delaySec } : l)),
    };
    // Leg 0 keeps its live time; the next legs take the first departure after the new arrival.
    return applyDepartures(late, [undefined, ...perLeg.slice(1)], transferSec);
  }

  /** Seconds the first vehicle to board is late (negative: early), when it can still be caught. */
  async function liveDelaySec(ride: Ride, now: Date): Promise<number | undefined> {
    const first = ride.legs[0];
    const pattern = first && network.patterns.get(first.patternId);
    const from = pattern?.stops[first.boardIndex];
    const to = pattern?.stops[first.alightIndex];
    if (!deps.live || !first || !pattern || !from || !to) return undefined;
    const boardAtMs = await deps.live.boardAtMs({
      line: pattern.line,
      fromStopId: from.stopId,
      toStopId: to.stopId,
      departAt: new Date(now.getTime() + first.boardElapsedSec * 1000).toISOString(),
    });
    if (boardAtMs === undefined) return undefined;
    const boardSec = (boardAtMs - now.getTime()) / 1000;
    const delaySec = Math.round(boardSec - first.boardElapsedSec);
    // Gone before the rider gets there, or a guess too far off to trust: keep the timetable.
    if (boardSec < ride.walkSec || Math.abs(delaySec) > MAX_LIVE_DELAY_SEC) return undefined;
    return Math.abs(delaySec) < MIN_LIVE_DELAY_SEC ? undefined : delaySec;
  }

  /** Credits the city's open data when the route uses its timetable or live positions. */
  function credited(route: Route): Route {
    const usesCityData = route.legs.some((l) => l.realDeparture || l.delaySec !== undefined);
    return usesCityData
      ? { ...route, attribution: [...route.attribution, CITY_TRANSIT_CREDIT] }
      : route;
  }

  /**
   * Walking legs drawn along real paths, with the places passed on them collected again along
   * the path (see `alongWalkPaths`). Times stay the planner's (straight line × detour factor).
   */
  async function withWalkPaths(route: Route, along: AlongPathsInput): Promise<Route> {
    const source = deps.walkPaths;
    if (!source) return route;
    const paths = await Promise.all(
      route.legs.map((leg) =>
        leg.mode === "walk" && leg.lngLats.length >= 2
          ? source.path(leg.lngLats.map(fromLngLat))
          : undefined,
      ),
    );
    return alongWalkPaths(route, paths, along);
  }

  /**
   * A walk; a loop is chosen on real paths. The `LOOP_CANDIDATES` best squares are measured on
   * the paths drawn through them. When none is within `LOOP_PATH_SLACK` of the budget, the
   * closest has its bare corners moved (the places at its corners stay), or, with none, the
   * square is planned again with the detour measured. Of the loops measured within the slack,
   * the best by places along its real path and shape is taken (`loopObjective`; else the one
   * closest to the budget), with times as long as its path.
   */
  async function walkFor(input: WalkInput): Promise<Walk | null> {
    const source = deps.walkPaths;
    if (!isLoop(input.origin, input.end) || !source) return planWalk(input);
    type Measured = { walk: Walk; pathSec: number; pathM: number; score: number };
    const measure = async (walk: Walk): Promise<Measured | undefined> => {
      if (walk.waypoints.length <= 2) return undefined;
      const path = await source.path(walk.waypoints);
      if (!path) return undefined;
      const pathM = cumulativeDistancesM(path).at(-1) ?? 0;
      const pathSec = pathM / DEFAULT_WALK_OPTIONS.walkSpeedMps;
      const score = scoreAlongPath(path, input.places, input.interests, input.prefs);
      return { walk, pathSec, pathM, score };
    };
    const off = (m: Measured) => Math.abs(m.pathSec / input.budgetSec - 1);
    const closest = (all: Measured[]) =>
      all.reduce<Measured | undefined>((a, b) => (!a || off(b) < off(a) ? b : a), undefined);

    const first = planSquareLoops(input, {}, LOOP_CANDIDATES);
    const measured = (await Promise.all(first.map(measure))).filter(
      (m): m is Measured => m !== undefined,
    );
    for (let i = 0; i < LOOP_REPLANS && !measured.some((m) => off(m) <= LOOP_PATH_SLACK); i++) {
      const near = closest(measured);
      if (!near) break;
      const { walk } = near;
      const straightM = polylineM(walk.waypoints);
      const detour = Math.min(LOOP_DETOUR_MAX, Math.max(LOOP_DETOUR_MIN, near.pathM / straightM));
      const next =
        resizeLoop(
          input,
          walk,
          polylineM(walk.corners ?? walk.waypoints) / (near.pathSec / input.budgetSec),
        ) ?? planSquareLoop(input, { detourFactor: detour });
      const m = await measure(next);
      if (!m) break;
      measured.push(m);
    }

    const value = (m: Measured) =>
      loopObjective(m.score, squareness((m.walk.corners ?? m.walk.waypoints).slice(0, -1)), off(m));
    const fitting = measured.filter((m) => off(m) <= LOOP_PATH_SLACK);
    const best = fitting.length
      ? fitting.reduce((a, b) => (value(b) > value(a) ? b : a))
      : closest(measured);
    // Times along the walk as long as the path drawn.
    return best ? withDetour(best.walk, best.pathSec / best.walk.elapsedSec) : (first[0] ?? null);
  }

  /** `walk` with its times stretched by `k` (a path longer than estimated). */
  function withDetour(walk: Walk, k: number): Walk {
    return {
      ...walk,
      elapsedSec: walk.elapsedSec * k,
      places: walk.places.map((p) => ({ ...p, etaSec: p.etaSec * k })),
    };
  }

  /** Plans with straight walking legs, then `drawn` puts them on real paths. */
  async function planRoute(request: PlanRouteRequest, now: Date): Promise<Route> {
    const { hitsByPattern, placesById } = await prepare(
      reachableBbox(
        request.destination ? [request.origin, request.destination] : [request.origin],
        request.durationMin ?? 0,
      ),
    );
    const interests = new Set(request.interests);
    const prefs = {
      richnessExponent: request.familiarity && RICHNESS_EXPONENT[request.familiarity],
      heard: request.heard && new Map(Object.entries(request.heard)),
    };
    const storyGapSec = request.storyStyle && STORY_GAP_SEC[request.storyStyle];
    const storyMaxSec = request.storyStyle && STORY_MAX_SEC[request.storyStyle];
    const story = { attribution, storyGapSec, storyMaxSec, now, placesById };
    const drawn = (route: Route) =>
      withWalkPaths(route, { placesById, interests, prefs, now, storyGapSec, storyMaxSec });

    // The user picked a walk: no ride is planned at all. Without a duration the walk takes
    // as long as the straight line at walking speed with the detour factor.
    if (request.travel === "walk") {
      const { walkDetourFactor, walkSpeedMps } = DEFAULT_FASTEST_OPTIONS;
      const budgetSec =
        request.durationMin !== undefined
          ? request.durationMin * 60
          : request.destination
            ? (haversineM(request.origin, request.destination) * walkDetourFactor) / walkSpeedMps
            : 0;
      const walk = await walkFor({
        places: [...placesById.values()],
        origin: request.origin,
        end: request.returnToStart ? request.origin : request.destination,
        budgetSec,
        interests,
        prefs,
      });
      if (!walk) throw new AppError("NOT_FOUND", "Nie udało się ułożyć spaceru z tych miejsc");
      return drawn(
        buildWalkRoute({
          ...story,
          walk,
          origin: request.origin,
          destination: request.destination,
        }),
      );
    }

    /**
     * The fastest way to the destination as a route: a walk when that is quicker, or
     * undefined for a walk with `rideOnly`.
     */
    const fastestRoute = async (destination: LatLng, rideOnly = false) => {
      const fastest = planFastest({
        network,
        hitsByPattern,
        placesById,
        origin: request.origin,
        destination,
        interests,
        prefs,
      });
      if (fastest.kind === "walk") {
        if (rideOnly) return undefined;
        return buildWalkRoute({
          ...story,
          walk: fastest.walk,
          origin: request.origin,
          destination,
        });
      }
      const ride = await withTimes(fastest.ride, now);
      return credited(
        buildRoute({
          ...story,
          ride,
          network,
          origin: request.origin,
          end: destination,
          walkInPlaces: walkInPlacesOf(ride, request.origin, interests, prefs, placesById),
        }),
      );
    };

    // No duration with a destination: the fastest way there.
    if (request.durationMin === undefined) {
      const fastest = await fastestRoute(
        request.destination as LatLng,
        request.travel === "transit",
      );
      if (!fastest) throw new AppError("NOT_FOUND", "Brak przejazdu komunikacją do tego celu");
      return drawn(fastest);
    }

    const budgetSec = request.durationMin * 60;
    const planned = planRide({
      network,
      hitsByPattern,
      placesById,
      origin: request.origin,
      budgetSec,
      interests,
      prefs,
      returnToStart: request.returnToStart,
      destination: request.destination,
    });

    const ride = planned && (await withTimes(planned, now));

    // Short rides: walking to a stop and waiting can take the whole time, so a walk
    // past places competes with the ride (a ride counts only if it fits the time).
    // Picked "transit" skips this; no pick (auto) walks only under WALK_UNDER_MIN.
    if (request.travel === undefined && request.durationMin < WALK_UNDER_MIN) {
      const walk = await walkFor({
        places: [...placesById.values()],
        origin: request.origin,
        end: request.returnToStart ? request.origin : request.destination,
        budgetSec,
        interests,
        prefs,
      });
      const rideFits =
        !!ride &&
        ride.elapsedSec <= DEFAULT_SEARCH_OPTIONS.maxBudgetShare * budgetSec &&
        ride.endsAtDestination !== false;
      if (walk && (!ride || !rideFits || walk.score > ride.score)) {
        return drawn(
          buildWalkRoute({
            ...story,
            walk,
            origin: request.origin,
            destination: request.destination,
          }),
        );
      }
    }
    if (!ride) {
      throw new AppError("NOT_FOUND", "Brak przystanku tramwaju ani autobusu w promieniu 500 m");
    }
    // A sightseeing ride that cannot reach the destination: rather the fastest ride there.
    if (request.destination && ride.endsAtDestination === false) {
      const fastest = await fastestRoute(request.destination, true);
      if (fastest) return drawn(fastest);
    }

    // Walking legs to the first stop and from the last one to where the user ends.
    const end = request.returnToStart
      ? ride.endsAtStart && request.origin
      : ride.endsAtDestination && request.destination;
    return drawn(
      credited(
        buildRoute({
          ...story,
          ride,
          network,
          origin: request.origin,
          end: end || undefined,
          walkInPlaces: walkInPlacesOf(ride, request.origin, interests, prefs, placesById),
        }),
      ),
    );
  }

  return { plan: planRoute };
}

function fingerprintOf(places: PlaceSummary[]): string {
  return places
    .map(
      (p) => `${p.id}@${p.position.lat},${p.position.lng}:${p.richness}:${p.interests.join("|")}`,
    )
    .sort()
    .join(";");
}
