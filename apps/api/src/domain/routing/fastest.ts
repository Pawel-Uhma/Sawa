import { haversineM, type LatLng } from "@sawa/shared";
import type { ChosenLeg, CollectedPlace, Ride } from "./beam-search";
import { MinQueue } from "./return-times";
import { type ScorePrefs, scorePlace } from "./score";
import type { Network, Pattern, PlaceHit, PlacePoint } from "./types";
import { type Walk, walkThrough } from "./walk-tour";

export type FastestInput = {
  network: Network;
  hitsByPattern: Map<string, PlaceHit[]>;
  placesById: Map<string, PlacePoint>;
  origin: LatLng;
  destination: LatLng;
  interests: ReadonlySet<string>;
  prefs?: ScorePrefs;
};

export type FastestOptions = {
  /** Walking distance to and from stops. */
  stopRadiusM: number;
  walkSpeedMps: number;
  /** A walk the whole way: streets are longer than a straight line (as in walk-tour.ts). */
  walkDetourFactor: number;
  transferSec: number;
};

export const DEFAULT_FASTEST_OPTIONS: FastestOptions = {
  stopRadiusM: 500,
  walkSpeedMps: 1.2,
  walkDetourFactor: 1.3,
  transferSec: 120,
};

export type Fastest = { kind: "ride"; ride: Ride } | { kind: "walk"; walk: Walk };

/** The leg that leaves a stop group on the fastest way to the destination. */
type Step = { patternId: string; boardIndex: number; alightIndex: number; next: string };

/**
 * Fastest way from `origin` to `destination`: reverse Dijkstra over stop groups in the
 * planner's model (half headway wait + transfer per leg, median ride times), starting from the
 * walk from each stop near the destination, so the walk at the end counts too. Places passed
 * are still collected for stories. Walks the whole way when that is quicker or no ride exists.
 */
export function planFastest(input: FastestInput, options: Partial<FastestOptions> = {}): Fastest {
  const opts = { ...DEFAULT_FASTEST_OPTIONS, ...options };
  const { network } = input;
  const walkSec = (a: LatLng, b: LatLng) => haversineM(a, b) / opts.walkSpeedMps;
  const near = (point: LatLng) =>
    [...network.stops.values()].filter((s) => haversineM(s.position, point) <= opts.stopRadiusM);

  // Seconds from each stop group to the destination, and the first leg of that way.
  const best = new Map<string, number>();
  const step = new Map<string, Step>();
  const queue = new MinQueue();
  for (const stop of near(input.destination)) {
    const sec = walkSec(stop.position, input.destination);
    if (sec < (best.get(stop.groupId) ?? Number.POSITIVE_INFINITY)) {
      best.set(stop.groupId, sec);
      queue.push(stop.groupId, sec);
    }
  }
  for (let item = queue.pop(); item; item = queue.pop()) {
    const [group, cost] = item;
    if (cost > (best.get(group) ?? Number.POSITIVE_INFINITY)) continue;
    for (const visit of network.visitsByGroup.get(group) ?? []) {
      const pattern = network.patterns.get(visit.patternId);
      if (!pattern) continue;
      const alightAt = pattern.stops[visit.index]?.atSec ?? 0;
      for (let i = 0; i < visit.index; i++) {
        const board = pattern.stops[i];
        const boardGroup = board && network.stops.get(board.stopId)?.groupId;
        if (!board || !boardGroup) continue;
        const candidate = cost + alightAt - board.atSec + pattern.headwaySec / 2 + opts.transferSec;
        if (candidate < (best.get(boardGroup) ?? Number.POSITIVE_INFINITY)) {
          best.set(boardGroup, candidate);
          step.set(boardGroup, {
            patternId: pattern.id,
            boardIndex: i,
            alightIndex: visit.index,
            next: group,
          });
          queue.push(boardGroup, candidate);
        }
      }
    }
  }

  // The best stop to walk to from the origin.
  let start: { groupId: string; sec: number } | undefined;
  for (const stop of near(input.origin)) {
    const sec = walkSec(input.origin, stop.position) + (best.get(stop.groupId) ?? Infinity);
    if (sec < (start?.sec ?? Number.POSITIVE_INFINITY)) start = { groupId: stop.groupId, sec };
  }

  const walkAllSec =
    (haversineM(input.origin, input.destination) * opts.walkDetourFactor) / opts.walkSpeedMps;
  const ride =
    start && step.has(start.groupId) ? buildRide(input, opts, start.groupId, step) : null;
  const rideTotalSec = ride
    ? ride.elapsedSec + walkSec(lastStopPosition(network, ride), input.destination)
    : Number.POSITIVE_INFINITY;
  if (ride && rideTotalSec < walkAllSec) return { kind: "ride", ride };

  // On foot the way bends slightly to pass right by places near it.
  const { waypoints, places, sec } = walkThrough(
    input.placesById.values(),
    input.origin,
    input.destination,
    opts.walkDetourFactor / opts.walkSpeedMps,
    { interests: input.interests, prefs: input.prefs },
  );
  return {
    kind: "walk",
    walk: {
      waypoints,
      places,
      elapsedSec: sec,
      score: places.reduce((sum, p) => sum + p.score, 0),
    },
  };
}

function lastStopPosition(network: Network, ride: Ride): LatLng {
  const leg = ride.legs[ride.legs.length - 1] as ChosenLeg;
  const stopId = network.patterns.get(leg.patternId)?.stops[leg.alightIndex]?.stopId ?? "";
  return network.stops.get(stopId)?.position as LatLng;
}

/** Follows the steps from `groupId` and times them forward from the origin. */
function buildRide(
  input: FastestInput,
  opts: FastestOptions,
  groupId: string,
  steps: Map<string, Step>,
): Ride {
  const { network } = input;
  const legs: ChosenLeg[] = [];
  const places: CollectedPlace[] = [];
  const seen = new Set<string>();
  let walkSec = 0;
  let elapsedSec = 0;
  for (let s = steps.get(groupId); s; s = steps.get(s.next)) {
    const pattern = network.patterns.get(s.patternId) as Pattern;
    const board = pattern.stops[s.boardIndex];
    const alight = pattern.stops[s.alightIndex];
    if (!board || !alight) break;
    if (legs.length === 0) {
      const boardStop = network.stops.get(board.stopId);
      walkSec = boardStop ? haversineM(input.origin, boardStop.position) / opts.walkSpeedMps : 0;
      elapsedSec = walkSec;
    }
    const boardElapsedSec =
      elapsedSec + pattern.headwaySec / 2 + (legs.length > 0 ? opts.transferSec : 0);
    const alightElapsedSec = boardElapsedSec + alight.atSec - board.atSec;
    for (const hit of input.hitsByPattern.get(pattern.id) ?? []) {
      const place = input.placesById.get(hit.placeId);
      if (!place || seen.has(hit.placeId) || hit.atSec <= board.atSec || hit.atSec > alight.atSec) {
        continue;
      }
      seen.add(hit.placeId);
      places.push({
        placeId: hit.placeId,
        etaSec: boardElapsedSec + hit.atSec - board.atSec,
        distanceM: hit.distanceM,
        legIndex: legs.length,
        score: scorePlace(place, hit.distanceM, input.interests, input.prefs),
      });
    }
    legs.push({
      patternId: pattern.id,
      boardIndex: s.boardIndex,
      alightIndex: s.alightIndex,
      boardElapsedSec,
      alightElapsedSec,
    });
    elapsedSec = alightElapsedSec;
  }
  const first = legs[0];
  return {
    originStopId:
      (first && network.patterns.get(first.patternId)?.stops[first.boardIndex]?.stopId) ?? "",
    walkSec,
    legs,
    places,
    elapsedSec,
    score: places.reduce((sum, p) => sum + p.score, 0),
    endsAtStart: false,
    endsAtDestination: true,
  };
}
