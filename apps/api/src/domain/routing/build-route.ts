import {
  fromLngLat,
  haversineM,
  type LatLng,
  type Leg,
  type Route,
  type RoutePlace,
  type Stop,
  toLngLat,
} from "@sawa/shared";
import type { CollectedPlace, Ride } from "./beam-search";
import { cumulativeDistancesM, slicePolyline } from "./geometry";
import { type ScorePrefs, scorePlace } from "./score";
import {
  MIN_STORY_GAP_SEC,
  STORY_MAX_SEC,
  selectStoryPlaces,
  storyWindowSec,
} from "./select-stories";
import type { LngLat, Network, Pattern, PatternStop, PlacePoint } from "./types";
import { placesAlongPath } from "./walk-on-paths";
import type { Walk } from "./walk-tour";

/** Shorter walks to or from a stop are not shown as a leg. */
const MIN_WALK_LEG_M = 30;
const WALK_SPEED_MPS = 1.2;

export type BuildRouteInput = {
  ride: Ride;
  network: Network;
  placesById: Map<string, PlacePoint>;
  /** Time of the request; all offsets in the ride count from here. */
  now: Date;
  attribution: string[];
  /** Shortest time between two narrated places (story style); default `MIN_STORY_GAP_SEC`. */
  storyGapSec?: number;
  /** Longest story (story style); default `STORY_MAX_SEC.fun`. */
  storyMaxSec?: number;
  /** Where the user starts: the walk to the first stop becomes a leg. */
  origin?: LatLng;
  /** Places passed on the walk to the first stop (see `placesAlong`). */
  walkInPlaces?: CollectedPlace[];
  /** Where the user ends (destination, or origin of a loop): the walk from the last stop. */
  end?: LatLng;
};

const at = (now: Date, offsetSec: number) =>
  new Date(now.getTime() + offsetSec * 1000).toISOString();

function toStop(network: Network, stopId: string): Stop {
  const stop = network.stops.get(stopId);
  if (!stop) throw new Error(`Unknown stop ${stopId}`);
  return { id: stop.id, name: stop.name, position: stop.position };
}

const pointStop = (id: string, name: string, position: LatLng): Stop => ({ id, name, position });

/** A walking leg: no line, straight segments between the points. */
function walkLeg(
  points: LatLng[],
  from: Stop,
  to: Stop,
  startSec: number,
  sec: number,
  now: Date,
): Leg {
  return {
    line: "",
    mode: "walk",
    headsign: to.name,
    fromStop: from,
    toStop: to,
    departAt: at(now, startSec),
    durationMin: Math.round(sec / 6) / 10,
    lngLats: points.map(toLngLat),
  };
}

/** Story places (spaced by `selectStoryPlaces`) with their ETA and story window. */
function toRoutePlaces(
  collected: CollectedPlace[],
  placesById: Map<string, PlacePoint>,
  endSec: number,
  gapSec = MIN_STORY_GAP_SEC,
  maxSec = STORY_MAX_SEC.fun,
): RoutePlace[] {
  const sorted = selectStoryPlaces(collected, gapSec);
  return sorted.flatMap((p, i) => {
    const place = placesById.get(p.placeId);
    if (!place) return [];
    const nextEtaSec = sorted[i + 1]?.etaSec ?? endSec;
    return [
      {
        placeId: p.placeId,
        name: place.name,
        position: place.position,
        etaSec: Math.round(p.etaSec),
        windowSec: storyWindowSec(nextEtaSec - p.etaSec, gapSec, maxSec),
        legIndex: p.legIndex,
        distanceM: Math.round(p.distanceM),
      },
    ];
  });
}

/**
 * A planned ride → the API `Route`: legs with shapes (plus walking legs to the first stop and
 * from the last one, when `origin` / `end` are given), and the places Sawa narrates.
 */
export function buildRoute({
  ride,
  network,
  placesById,
  now,
  attribution,
  storyGapSec,
  storyMaxSec,
  origin,
  end,
  walkInPlaces = [],
}: BuildRouteInput): Route {
  const rideLegs: Leg[] = ride.legs.map((leg) => {
    const pattern = network.patterns.get(leg.patternId) as Pattern;
    const board = pattern.stops[leg.boardIndex] as PatternStop;
    const alight = pattern.stops[leg.alightIndex] as PatternStop;
    const cumDistM = cumulativeDistancesM(pattern.lngLats);
    return {
      line: pattern.line,
      mode: pattern.mode,
      headsign: pattern.headsign,
      fromStop: toStop(network, board.stopId),
      toStop: toStop(network, alight.stopId),
      departAt: at(now, leg.boardElapsedSec),
      ...(leg.realDeparture ? { realDeparture: true } : {}),
      ...(leg.delaySec === undefined ? {} : { delaySec: leg.delaySec }),
      durationMin: Math.round((leg.alightElapsedSec - leg.boardElapsedSec) / 6) / 10,
      lngLats: slicePolyline(pattern.lngLats, cumDistM, board.alongM, alight.alongM),
    };
  });

  const first = rideLegs[0];
  const last = rideLegs[rideLegs.length - 1];
  const walkIn =
    origin && first && haversineM(origin, first.fromStop.position) >= MIN_WALK_LEG_M
      ? walkLeg(
          [origin, first.fromStop.position],
          pointStop("start", "Start", origin),
          first.fromStop,
          0,
          ride.walkSec,
          now,
        )
      : undefined;
  const outM = end && last ? haversineM(last.toStop.position, end) : 0;
  const walkOutSec = outM / WALK_SPEED_MPS;
  const walkOut =
    end && last && outM >= MIN_WALK_LEG_M
      ? walkLeg(
          [last.toStop.position, end],
          last.toStop,
          pointStop("end", "Cel", end),
          ride.elapsedSec,
          walkOutSec,
          now,
        )
      : undefined;
  const legs = [...(walkIn ? [walkIn] : []), ...rideLegs, ...(walkOut ? [walkOut] : [])];

  return {
    id: ride.legs.map((l) => `${l.patternId}:${l.boardIndex}-${l.alightIndex}`).join("|"),
    legs,
    places: toRoutePlaces(
      [
        // Places on the walk to the first stop belong to that walking leg.
        ...(walkIn ? walkInPlaces : []),
        ...ride.places.map((p) => ({ ...p, legIndex: p.legIndex + (walkIn ? 1 : 0) })),
      ],
      placesById,
      ride.elapsedSec,
      storyGapSec,
      storyMaxSec,
    ),
    totalMin: Math.round((ride.elapsedSec + (walkOut ? walkOutSec : 0)) / 6) / 10,
    endsAtStart: ride.endsAtStart,
    ...(ride.endsAtDestination === undefined ? {} : { endsAtDestination: ride.endsAtDestination }),
    attribution,
  };
}

export type BuildWalkRouteInput = {
  walk: Walk;
  placesById: Map<string, PlacePoint>;
  now: Date;
  attribution: string[];
  storyGapSec?: number;
  storyMaxSec?: number;
  origin: LatLng;
  /** Requested destination, if any (sets `endsAtDestination`). */
  destination?: LatLng;
};

/** A walk → the API `Route`: one walking leg through the places walked to. */
export function buildWalkRoute({
  walk,
  placesById,
  now,
  attribution,
  storyGapSec,
  storyMaxSec,
  origin,
  destination,
}: BuildWalkRouteInput): Route {
  const endPoint = walk.waypoints[walk.waypoints.length - 1] ?? origin;
  const lastPlace = walk.lastPlaceId ? placesById.get(walk.lastPlaceId) : undefined;
  const endName = lastPlace?.name ?? (destination ? "Cel" : "Start");
  const leg = walkLeg(
    walk.waypoints,
    pointStop("start", "Start", origin),
    pointStop("end", endName, endPoint),
    0,
    walk.elapsedSec,
    now,
  );
  return {
    id: `walk:${walk.waypoints.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join("|")}`,
    legs: [leg],
    places: toRoutePlaces(walk.places, placesById, walk.elapsedSec, storyGapSec, storyMaxSec),
    totalMin: Math.round(walk.elapsedSec / 6) / 10,
    endsAtStart: haversineM(endPoint, origin) <= 500,
    ...(destination ? { endsAtDestination: haversineM(endPoint, destination) <= 500 } : {}),
    attribution,
  };
}

export type AlongPathsInput = {
  placesById: Map<string, PlacePoint>;
  interests: ReadonlySet<string>;
  prefs?: ScorePrefs;
  now: Date;
  storyGapSec?: number;
  storyMaxSec?: number;
};

/**
 * `route` with walking legs drawn along `paths` (by leg index; legs without one stay as they
 * are). Places on those legs are collected again along the real path: the straight line between
 * waypoints can run a block away from the streets the walker takes (around a railway, a park),
 * so places by that line are not passed, and others are. Places walked to (inner waypoints)
 * stay. Times stay the planner's; each place gets its share of the leg by distance along it.
 */
export function alongWalkPaths(
  route: Route,
  paths: (LngLat[] | undefined)[],
  { placesById, interests, prefs, now, storyGapSec, storyMaxSec }: AlongPathsInput,
): Route {
  const redrawn = new Set(paths.flatMap((p, i) => (p ? [i] : [])));
  if (redrawn.size === 0) return route;

  const kept: CollectedPlace[] = route.places.flatMap((p) => {
    const place = placesById.get(p.placeId);
    if (redrawn.has(p.legIndex) || !place) return [];
    return [{ ...p, score: scorePlace(place, p.distanceM, interests, prefs) }];
  });
  const taken = new Set(kept.map((p) => p.placeId));

  const legs = route.legs.map((leg, legIndex) => {
    const path = paths[legIndex];
    if (!path) return leg;
    const passed = placesAlongPath(
      placesById.values(),
      path,
      {
        startSec: (new Date(leg.departAt).getTime() - now.getTime()) / 1000,
        sec: leg.durationMin * 60,
        legIndex,
        walkedTo: leg.lngLats.slice(1, -1).map(fromLngLat),
        skip: taken,
      },
      { interests, prefs },
    );
    for (const p of passed) taken.add(p.placeId);
    kept.push(...passed);
    return { ...leg, lngLats: path };
  });

  return {
    ...route,
    legs,
    places: toRoutePlaces(kept, placesById, route.totalMin * 60, storyGapSec, storyMaxSec),
  };
}
