import { haversineM, type LatLng } from "@sawa/shared";
import { scorePlace } from "./score";
import type { Network, Pattern, PatternStop, PlaceHit, PlacePoint } from "./types";

export type SearchInput = {
  network: Network;
  hitsByPattern: Map<string, PlaceHit[]>;
  placesById: Map<string, PlacePoint>;
  origin: LatLng;
  budgetSec: number;
  interests: ReadonlySet<string>;
};

export type SearchOptions = {
  beamWidth: number;
  maxLegs: number;
  originRadiusM: number;
  maxOriginStops: number;
  walkSpeedMps: number;
  transferSec: number;
  maxStatesPerPattern: number;
  transferPenalty: number;
  minBudgetShare: number;
  maxBudgetShare: number;
};

export const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  beamWidth: 8,
  maxLegs: 3,
  originRadiusM: 500,
  maxOriginStops: 12,
  walkSpeedMps: 1.2,
  transferSec: 120,
  maxStatesPerPattern: 2,
  transferPenalty: 0.5,
  minBudgetShare: 0.9,
  maxBudgetShare: 1.1,
};

export type ChosenLeg = {
  patternId: string;
  boardIndex: number;
  alightIndex: number;
  boardElapsedSec: number;
  alightElapsedSec: number;
};

export type CollectedPlace = {
  placeId: string;
  /** Seconds since the request (walk + wait + ride). */
  etaSec: number;
  distanceM: number;
  legIndex: number;
  score: number;
};

export type Ride = {
  originStopId: string;
  walkSec: number;
  legs: ChosenLeg[];
  places: CollectedPlace[];
  elapsedSec: number;
  score: number;
};

type State = Ride & { stopId: string; visited: ReadonlySet<string>; key: string };

const transfersOf = (s: Ride) => Math.max(0, s.legs.length - 1);

/** Higher is better. */
function objective(s: Ride, budgetSec: number, opts: SearchOptions): number {
  const budgetMiss = Math.abs(s.elapsedSec - budgetSec) / budgetSec;
  return s.score - opts.transferPenalty * transfersOf(s) - budgetMiss;
}

/** Deterministic order: best objective, then fewer transfers, then key. */
function byObjective(budgetSec: number, opts: SearchOptions) {
  return (a: State, b: State) =>
    objective(b, budgetSec, opts) - objective(a, budgetSec, opts) ||
    transfersOf(a) - transfersOf(b) ||
    a.key.localeCompare(b.key);
}

function originStates(input: SearchInput, opts: SearchOptions): State[] {
  return [...input.network.stops.values()]
    .map((stop) => ({ stop, distanceM: haversineM(input.origin, stop.position) }))
    .filter(({ distanceM }) => distanceM <= opts.originRadiusM)
    .sort((a, b) => a.distanceM - b.distanceM || a.stop.id.localeCompare(b.stop.id))
    .slice(0, opts.maxOriginStops)
    .map(({ stop, distanceM }) => {
      const walkSec = distanceM / opts.walkSpeedMps;
      return {
        originStopId: stop.id,
        walkSec,
        legs: [],
        places: [],
        elapsedSec: walkSec,
        score: 0,
        stopId: stop.id,
        visited: new Set<string>(),
        key: stop.id,
      };
    });
}

function canTransferAt(network: Network, stopId: string, line: string): boolean {
  const groupId = network.stops.get(stopId)?.groupId;
  const visits = groupId ? network.visitsByGroup.get(groupId) : undefined;
  return (visits ?? []).some((v) => network.patterns.get(v.patternId)?.line !== line);
}

/** Every ride that extends `state` by one leg and ends where it can finish or transfer. */
function expand(state: State, input: SearchInput, opts: SearchOptions): State[] {
  const { network } = input;
  const minSec = opts.minBudgetShare * input.budgetSec;
  const maxSec = opts.maxBudgetShare * input.budgetSec;
  const groupId = network.stops.get(state.stopId)?.groupId;
  const visits = (groupId && network.visitsByGroup.get(groupId)) || [];
  const usedLines = new Set(state.legs.map((l) => network.patterns.get(l.patternId)?.line));
  const isLastLeg = state.legs.length + 1 >= opts.maxLegs;
  const legIndex = state.legs.length;
  const children: State[] = [];

  for (const visit of visits) {
    const pattern = network.patterns.get(visit.patternId) as Pattern;
    const board = pattern.stops[visit.index] as PatternStop;
    if (usedLines.has(pattern.line) || visit.index === pattern.stops.length - 1) continue;

    const waitSec = pattern.headwaySec / 2 + (legIndex > 0 ? opts.transferSec : 0);
    const boardElapsedSec = state.elapsedSec + waitSec;
    const hits = input.hitsByPattern.get(pattern.id) ?? [];
    let hitIndex = hits.findIndex((h) => h.atSec > board.atSec);
    if (hitIndex < 0) hitIndex = hits.length;

    let gain = 0;
    const gained: CollectedPlace[] = [];

    for (let j = visit.index + 1; j < pattern.stops.length; j++) {
      const stop = pattern.stops[j] as PatternStop;
      const alightElapsedSec = boardElapsedSec + stop.atSec - board.atSec;
      if (alightElapsedSec > maxSec) break;

      for (
        ;
        hitIndex < hits.length && (hits[hitIndex] as PlaceHit).atSec <= stop.atSec;
        hitIndex++
      ) {
        const hit = hits[hitIndex] as PlaceHit;
        const place = input.placesById.get(hit.placeId);
        if (
          !place ||
          state.visited.has(hit.placeId) ||
          gained.some((g) => g.placeId === hit.placeId)
        ) {
          continue;
        }
        const score = scorePlace(place, hit.distanceM, input.interests);
        gain += score;
        gained.push({
          placeId: hit.placeId,
          etaSec: boardElapsedSec + hit.atSec - board.atSec,
          distanceM: hit.distanceM,
          legIndex,
          score,
        });
      }

      const finishes = alightElapsedSec >= minSec;
      const transfers = !isLastLeg && canTransferAt(network, stop.stopId, pattern.line);
      const terminus = j === pattern.stops.length - 1;
      if (!finishes && !transfers && !terminus) continue;

      const visited = new Set(state.visited);
      for (const g of gained) visited.add(g.placeId);
      children.push({
        originStopId: state.originStopId,
        walkSec: state.walkSec,
        legs: [
          ...state.legs,
          {
            patternId: pattern.id,
            boardIndex: visit.index,
            alightIndex: j,
            boardElapsedSec,
            alightElapsedSec,
          },
        ],
        places: [...state.places, ...gained],
        elapsedSec: alightElapsedSec,
        score: state.score + gain,
        stopId: stop.stopId,
        visited,
        key: `${state.key}|${pattern.id}:${visit.index}-${j}`,
      });
    }
  }
  return children;
}

/** The best open states, at most a few per last pattern so the beam stays diverse. */
function selectBeam(
  states: State[],
  cmp: (a: State, b: State) => number,
  opts: SearchOptions,
): State[] {
  const perPattern = new Map<string, number>();
  const beam: State[] = [];
  for (const s of [...states].sort(cmp)) {
    const last = s.legs[s.legs.length - 1]?.patternId ?? "";
    const n = perPattern.get(last) ?? 0;
    if (n >= opts.maxStatesPerPattern) continue;
    perPattern.set(last, n + 1);
    beam.push(s);
    if (beam.length >= opts.beamWidth) break;
  }
  return beam;
}

function toRide(s: State): Ride {
  const { originStopId, walkSec, legs, places, elapsedSec, score } = s;
  return { originStopId, walkSec, legs, places, elapsedSec, score };
}

/**
 * Beam search for a sightseeing ride on trams and buses: up to `maxLegs - 1` transfers,
 * total time within [minBudgetShare, maxBudgetShare] × budget, maximising place scores.
 * Returns null only when no stop is near the origin.
 */
export function planRide(input: SearchInput, options: Partial<SearchOptions> = {}): Ride | null {
  const opts = { ...DEFAULT_SEARCH_OPTIONS, ...options };
  const cmp = byObjective(input.budgetSec, opts);
  const minSec = opts.minBudgetShare * input.budgetSec;

  let beam = originStates(input, opts);
  if (beam.length === 0) return null;

  const finished: State[] = [];
  const partial: State[] = [];
  for (let depth = 0; depth < opts.maxLegs && beam.length > 0; depth++) {
    const open: State[] = [];
    for (const child of beam.flatMap((s) => expand(s, input, opts))) {
      (child.elapsedSec >= minSec ? finished : open).push(child);
    }
    partial.push(...open);
    beam = selectBeam(open, cmp, opts);
  }

  const best = [...finished].sort(cmp)[0];
  if (best) return toRide(best);

  // Lines too short for the budget: the best ride over half the budget, else the longest one.
  const halfway = partial.filter((s) => s.elapsedSec >= input.budgetSec / 2);
  const fallback = [...(halfway.length > 0 ? halfway : partial)].sort(
    (a, b) => b.score - a.score || b.elapsedSec - a.elapsedSec || a.key.localeCompare(b.key),
  )[0];
  return fallback ? toRide(fallback) : null;
}
