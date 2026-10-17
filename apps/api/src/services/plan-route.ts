import { fromLngLat, type LatLng, type PlanRouteRequest, type Route, toLngLat } from "@sawa/shared";
import { FOOT_ROUTING_ATTRIBUTION } from "../adapters/osm/foot-routing";
import type { BBox, PlaceSummary } from "../domain/place";
import { applyDepartures } from "../domain/routing/apply-departures";
import { DEFAULT_SEARCH_OPTIONS, planRide, type Ride } from "../domain/routing/beam-search";
import { buildRoute, buildWalkRoute } from "../domain/routing/build-route";
import { planFastest } from "../domain/routing/fastest";
import { computePlaceHits } from "../domain/routing/place-hits";
import { RICHNESS_EXPONENT, type ScorePrefs } from "../domain/routing/score";
import { STORY_GAP_SEC, STORY_MAX_SEC } from "../domain/routing/select-stories";
import { shiftRide } from "../domain/routing/shift-ride";
import { toPlacePoints } from "../domain/routing/to-place-points";
import type { PlaceHit, PlacePoint } from "../domain/routing/types";
import { placesAlong, planWalk } from "../domain/routing/walk-tour";
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
  /** Street paths for walking legs (drawn straight without it). */
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

  /** Puts each leg on a real departure from the ZTM timetable, when there is a source. */
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
      return (await fastestRoute(request.destination as LatLng)) as Route;
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
    if (request.durationMin < WALK_UNDER_MIN) {
      const walk = planWalk({
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
        return buildWalkRoute({
          ...story,
          walk,
          origin: request.origin,
          destination: request.destination,
        });
      }
    }
    if (!ride) {
      throw new AppError("NOT_FOUND", "Brak przystanku tramwaju ani autobusu w promieniu 500 m");
    }
    // A sightseeing ride that cannot reach the destination: rather the fastest ride there.
    if (request.destination && ride.endsAtDestination === false) {
      const fastest = await fastestRoute(request.destination, true);
      if (fastest) return fastest;
    }

    // Walking legs to the first stop and from the last one to where the user ends.
    const end = request.returnToStart
      ? ride.endsAtStart && request.origin
      : ride.endsAtDestination && request.destination;
    return credited(
      buildRoute({
        ...story,
        ride,
        network,
        origin: request.origin,
        end: end || undefined,
        walkInPlaces: walkInPlacesOf(ride, request.origin, interests, prefs, placesById),
      }),
    );
  }

  /** Walking legs along streets instead of straight lines, where the router answers. */
  async function withStreetWalks(route: Route): Promise<Route> {
    const source = deps.walkPaths;
    if (!source || !route.legs.some((l) => l.mode === "walk")) return route;
    let routed = false;
    const legs = await Promise.all(
      route.legs.map(async (leg) => {
        if (leg.mode !== "walk" || leg.lngLats.length < 2) return leg;
        const segments = await Promise.all(
          leg.lngLats.slice(1).map(async (to, i) => {
            const from = leg.lngLats[i] as [number, number];
            const path = await source.path(fromLngLat(from), fromLngLat(to));
            if (path) routed = true;
            return path ? path.map(toLngLat) : [from, to];
          }),
        );
        // Consecutive segments share their joint point.
        const lngLats = segments.flatMap((s, i) => (i === 0 ? s : s.slice(1)));
        return { ...leg, lngLats };
      }),
    );
    return routed
      ? { ...route, legs, attribution: [...route.attribution, FOOT_ROUTING_ATTRIBUTION] }
      : route;
  }

  return {
    async plan(request, now) {
      return withStreetWalks(await planRoute(request, now));
    },
  };
}

function fingerprintOf(places: PlaceSummary[]): string {
  return places
    .map(
      (p) => `${p.id}@${p.position.lat},${p.position.lng}:${p.richness}:${p.interests.join("|")}`,
    )
    .sort()
    .join(";");
}
