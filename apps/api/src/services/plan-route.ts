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
} from "../domain/routing/build-route";
import { DEFAULT_FASTEST_OPTIONS, planFastest } from "../domain/routing/fastest";
import { computePlaceHits } from "../domain/routing/place-hits";
import { RICHNESS_EXPONENT, type ScorePrefs } from "../domain/routing/score";
import { STORY_GAP_SEC, STORY_MAX_SEC } from "../domain/routing/select-stories";
import { shiftRide } from "../domain/routing/shift-ride";
import { toPlacePoints } from "../domain/routing/to-place-points";
import type { PlaceHit, PlacePoint } from "../domain/routing/types";
import { pickWalkOnPaths } from "../domain/routing/walk-on-paths";
import { placesAlong, planWalks, type Walk, type WalkInput } from "../domain/routing/walk-tour";
import { AppError } from "../lib/errors";
import type {
  DepartureSource,
  LiveBoardingSource,
  PlacesRepository,
  TransitData,
  WalkPathSource,
} from "./ports";

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
/** Walks compared along their real paths (one walk router request each). */
const WALK_ALTERNATIVES = 4;
/** Places come from Supabase; refetched this often so new places reach routes without a restart. */
const PLACES_TTL_MS = 10 * 60_000;
/** After a failed fetch (fallback in use) Supabase is retried sooner. */
const RETRY_TTL_MS = 60_000;
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

export function createRoutePlanner(deps: {
  transit: TransitData;
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
}): RoutePlanner {
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
   * The walk to take: the planner's best few walks (planned on straight lines) compared along
   * their real paths (`pickWalkOnPaths`), so a walk that needs a long way round loses. Without
   * paths the planner's best.
   */
  async function planWalkOnPaths(input: WalkInput): Promise<Walk | null> {
    const walks = planWalks(input, {}, WALK_ALTERNATIVES);
    const source = deps.walkPaths;
    if (!source || walks.length === 0) return walks[0] ?? null;
    const paths = await Promise.all(walks.map((walk) => source.path(walk.waypoints)));
    const onPaths = walks.map((walk, i) => ({ walk, path: paths[i] }));
    return pickWalkOnPaths(onPaths, input) ?? walks[0] ?? null;
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
      const walk = await planWalkOnPaths({
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
      const walk = await planWalkOnPaths({
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
