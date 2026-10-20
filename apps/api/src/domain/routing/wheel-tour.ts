import {
  type BikeStation,
  haversineM,
  type LatLng,
  type Leg,
  type Route,
  type Stop,
  toLngLat,
} from "@sawa/shared";
import type { CollectedPlace } from "./beam-search";
import { MAX_DROPOFF_WALK_M, MAX_STATION_WALK_M, nearestStation } from "./bike-stations";
import { pointStop, toRoutePlaces } from "./build-route";
import type { ScorePrefs } from "./score";
import { type WheelMode, wheelSec, wheelStoryTimes, wheelWalkOptions } from "./travel-modes";
import type { PlacePoint } from "./types";
import { DEFAULT_WALK_OPTIONS, placesAlong, planBeamWalk } from "./walk-tour";

/** Ends this close to the origin or the destination count as reached (as for walks). */
const REACHED_M = 500;
/** A ride leg gets at least this long, however much of the budget the walks to stations take. */
const MIN_RIDE_SEC = 5 * 60;

export const VETURILO_CREDIT = "Stacje Veturilo: Nextbike Polska, GBFS (CC0)";

export type WheelTourInput = {
  mode: WheelMode;
  places: PlacePoint[];
  placesById: Map<string, PlacePoint>;
  origin: LatLng;
  /** Where the tour must end (origin for a loop, the destination); free when missing. */
  end?: LatLng;
  /** Requested destination, if any (sets `endsAtDestination`). */
  destination?: LatLng;
  /** Seconds the whole tour should take; missing: the quickest way to `end`. */
  budgetSec?: number;
  interests: ReadonlySet<string>;
  prefs?: ScorePrefs;
  /** Story style's gap and longest story, before scaling for the speed. */
  styleGapSec?: number;
  styleMaxSec?: number;
  /** Veturilo stations with live counts; empty or missing: one's own bike. */
  stations?: readonly BikeStation[];
  now: Date;
  attribution: string[];
};

type Segment = {
  mode: Leg["mode"];
  waypoints: LatLng[];
  from: Stop;
  to: Stop;
  startSec: number;
  sec: number;
  /** `etaSec` from the start of the tour. */
  places: CollectedPlace[];
};

const walkSec = (a: LatLng, b: LatLng) =>
  (haversineM(a, b) * DEFAULT_WALK_OPTIONS.detourFactor) / DEFAULT_WALK_OPTIONS.walkSpeedMps;

const stationStop = (s: BikeStation): Stop => ({
  id: `veturilo-${s.id}`,
  name: s.name,
  position: s.position,
});

/** A straight walk segment with the places right by it. */
function walkSegment(
  input: WheelTourInput,
  from: Stop,
  to: Stop,
  startSec: number,
  skip: ReadonlySet<string>,
): Segment {
  const sec = walkSec(from.position, to.position);
  const places = placesAlong(
    input.places,
    { from: from.position, to: to.position, startSec, sec },
    { interests: input.interests, prefs: input.prefs, skip },
  );
  return { mode: "walk", waypoints: [from.position, to.position], from, to, startSec, sec, places };
}

/**
 * The ride from `from` (to `end`, when given) on the tour's mode: the beam search over places
 * at that speed, within `budgetSec` (missing: as long as the straight way to `end`).
 */
function rideSegment(
  input: WheelTourInput,
  from: Stop,
  end: Stop | undefined,
  startSec: number,
  budgetSec: number | undefined,
  skip: ReadonlySet<string>,
): Segment | null {
  const budget =
    budgetSec ?? (end ? wheelSec(input.mode, haversineM(from.position, end.position)) : 0);
  const tour = planBeamWalk(
    {
      places: input.places.filter((p) => !skip.has(p.id)),
      origin: from.position,
      end: end?.position,
      budgetSec: Math.max(budget, 1),
      interests: input.interests,
      prefs: input.prefs,
    },
    wheelWalkOptions(input.mode),
  );
  if (!tour) return null;
  const last = tour.waypoints[tour.waypoints.length - 1] ?? from.position;
  const lastPlace = tour.lastPlaceId ? input.placesById.get(tour.lastPlaceId) : undefined;
  return {
    mode: input.mode,
    waypoints: tour.waypoints,
    from,
    to: end ?? pointStop("end", lastPlace?.name ?? "Koniec", last),
    startSec,
    sec: tour.elapsedSec,
    places: tour.places.map((p) => ({ ...p, etaSec: p.etaSec + startSec })),
  };
}

/** Walk to a Veturilo station with bikes, ride, leave the bike at one with docks, walk on. */
function veturiloSegments(input: WheelTourInput, pickup: BikeStation): Segment[] | null {
  const stations = input.stations ?? [];
  const start = pointStop("start", "Start", input.origin);
  const walkIn = walkSegment(input, start, stationStop(pickup), 0, new Set());
  const seen = new Set(walkIn.places.map((p) => p.placeId));

  const dropoff = input.end && nearestStation(stations, input.end, "dock", MAX_DROPOFF_WALK_M);
  const walkOutSec = input.end && dropoff ? walkSec(dropoff.position, input.end) : 0;
  const rideBudget =
    input.budgetSec === undefined
      ? undefined
      : Math.max(MIN_RIDE_SEC, input.budgetSec - walkIn.sec - walkOutSec);
  const rideEnd = dropoff ? stationStop(dropoff) : input.end && pointStop("end", "Cel", input.end);
  const ride = rideSegment(input, walkIn.to, rideEnd, walkIn.sec, rideBudget, seen);
  if (!ride) return null;
  for (const p of ride.places) seen.add(p.placeId);
  const segments = [walkIn, ride];

  if (!input.end) {
    // A free tour: the bike goes back at the station nearest to where the ride ended.
    const at = ride.waypoints[ride.waypoints.length - 1] ?? pickup.position;
    const back = nearestStation(stations, at, "dock", MAX_DROPOFF_WALK_M);
    if (back && haversineM(at, back.position) > 0) {
      const extraSec = wheelSec(input.mode, haversineM(at, back.position));
      ride.waypoints = [...ride.waypoints, back.position];
      ride.to = stationStop(back);
      ride.sec += extraSec;
    }
  } else if (dropoff) {
    segments.push(
      walkSegment(
        input,
        ride.to,
        pointStop("end", "Cel", input.end),
        ride.startSec + ride.sec,
        seen,
      ),
    );
  }
  return segments;
}

function toLeg(segment: Segment, now: Date): Leg {
  return {
    line: "",
    mode: segment.mode,
    headsign: segment.to.name,
    fromStop: segment.from,
    toStop: segment.to,
    departAt: new Date(now.getTime() + segment.startSec * 1000).toISOString(),
    durationMin: Math.round(segment.sec / 6) / 10,
    lngLats: segment.waypoints.map(toLngLat),
  };
}

/** Station counts in the route, as of when it was planned. */
function stationsOf(input: WheelTourInput, segments: Segment[]): Route["bikeStations"] {
  const byStop = new Map((input.stations ?? []).map((s) => [`veturilo-${s.id}`, s]));
  const ride = segments.find((s) => s.mode === "bike");
  const pickup = ride && byStop.get(ride.from.id);
  const dropoff = ride && byStop.get(ride.to.id);
  return pickup ? { pickup, ...(dropoff ? { dropoff } : {}) } : undefined;
}

/**
 * A tour by bike or car through places (#190, #191). On a bike with a Veturilo station near the
 * start (`MAX_STATION_WALK_M`, with a bike) the route walks there, rides to the station with
 * free docks nearest the end and walks on (#192); else one ride from the origin (one's own
 * bike, the car). Legs have straight lines; the service puts them on roads.
 */
export function planWheelTour(input: WheelTourInput): Route | null {
  const pickup =
    input.mode === "bike"
      ? nearestStation(input.stations ?? [], input.origin, "bike", MAX_STATION_WALK_M)
      : undefined;
  const start = pointStop("start", "Start", input.origin);
  const end = input.end && pointStop("end", input.destination ? "Cel" : "Start", input.end);
  const own = () => rideSegment(input, start, end, 0, input.budgetSec, new Set());
  const segments = (pickup && veturiloSegments(input, pickup)) ?? [own()].filter((s) => s !== null);
  if (segments.length === 0) return null;

  const last = segments[segments.length - 1] as Segment;
  const endPoint = last.waypoints[last.waypoints.length - 1] ?? input.origin;
  const totalSec = last.startSec + last.sec;
  const bikeStations = stationsOf(input, segments);
  const { storyGapSec, storyMaxSec } = wheelStoryTimes(
    input.mode,
    input.styleGapSec,
    input.styleMaxSec,
  );
  const collected = segments.flatMap((s, legIndex) => s.places.map((p) => ({ ...p, legIndex })));
  return {
    id: `${input.mode}:${segments
      .flatMap((s) => s.waypoints)
      .map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`)
      .join("|")}`,
    legs: segments.map((s) => toLeg(s, input.now)),
    places: toRoutePlaces(collected, input.placesById, totalSec, storyGapSec, storyMaxSec),
    totalMin: Math.round(totalSec / 6) / 10,
    endsAtStart: haversineM(endPoint, input.origin) <= REACHED_M,
    ...(input.destination
      ? { endsAtDestination: haversineM(endPoint, input.destination) <= REACHED_M }
      : {}),
    attribution: bikeStations ? [...input.attribution, VETURILO_CREDIT] : input.attribution,
    ...(bikeStations ? { bikeStations } : {}),
  };
}
