import { haversineM, type LatLng } from "@sawa/shared";
import { computeReturnTimes } from "./return-times";
import { scorePlace } from "./score";
import type { Network, Pattern, PatternStop, PlaceHit, PlacePoint } from "./types";

export type SearchInput = {
  network: Network;
  hitsByPattern: Map<string, PlaceHit[]>;
  placesById: Map<string, PlacePoint>;
  origin: LatLng;
  budgetSec: number;
  interests: ReadonlySet<string>;
  /** Loop: the ride must end at a stop near the origin. */
  returnToStart?: boolean;
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
  /** Loops need one more leg to come back and may end a bit earlier. */
  loopMaxLegs: number;
  loopMinBudgetShare: number;
  /** Loops keep at most one ride per end stop group, in a wider beam. */
  loopBeamWidth: number;
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
  loopMaxLegs: 4,
  loopMinBudgetShare: 0.8,
  loopBeamWidth: 24,
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
  /** The last stop is near the origin (a loop). */
  endsAtStart: boolean;
};

type State = Omit<Ride, "endsAtStart"> & {
  stopId: string;
  visited: ReadonlySet<string>;
  key: string;
  finished: boolean;
  /** Loops: time still needed to get back to the origin (0 otherwise). */
  backSec: number;
};

/** Per-search settings shared by every expansion. */
type Context = {
  opts: SearchOptions;
  loop: boolean;
  minSec: number;
  maxSec: number;
  groupOf: (stopId: string) => string | undefined;
  nearOrigin: (stopId: string) => boolean;
  /** Loops: seconds back to the origin per stop group (see return-times.ts). */
  returnTimes: Map<string, number>;
};

const transfersOf = (s: State) => Math.max(0, s.legs.length - 1);

/** Higher is better. For loops the expected total includes the time to get back. */
function objective(s: State, budgetSec: number, opts: SearchOptions): number {
  const budgetMiss = Math.abs(s.elapsedSec + s.backSec - budgetSec) / budgetSec;
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
        finished: false,
        backSec: 0,
      };
    });
}

/**
 * Whether another leg can start at this stop group: a different line, or in a loop also
 * another variant of the same line (turning back the way you came).
 */
function canTransferAt(network: Network, stopId: string, pattern: Pattern, loop: boolean): boolean {
  const groupId = network.stops.get(stopId)?.groupId;
  const visits = groupId ? network.visitsByGroup.get(groupId) : undefined;
  return (visits ?? []).some((v) =>
    loop ? v.patternId !== pattern.id : network.patterns.get(v.patternId)?.line !== pattern.line,
  );
}

function backFrom(ctx: Context, stopId: string): number {
  const group = ctx.groupOf(stopId);
  return (group && ctx.returnTimes.get(group)) ?? Number.POSITIVE_INFINITY;
}

/** Every ride that extends `state` by one leg and ends where it can finish or transfer. */
function expand(state: State, input: SearchInput, ctx: Context): State[] {
  const { network } = input;
  const { opts, minSec, maxSec } = ctx;
  const groupId = ctx.groupOf(state.stopId);
  const visits = (groupId && network.visitsByGroup.get(groupId)) || [];
  const usedLines = new Set(state.legs.map((l) => network.patterns.get(l.patternId)?.line));
  const usedPatterns = new Set(state.legs.map((l) => l.patternId));
  const isLastLeg = state.legs.length + 1 >= opts.maxLegs;
  const legIndex = state.legs.length;
  const children: State[] = [];

  for (const visit of visits) {
    const pattern = network.patterns.get(visit.patternId) as Pattern;
    const board = pattern.stops[visit.index] as PatternStop;
    // A loop may come back on a line it already used (the same tram the other way),
    // but never rides the same variant twice; a normal ride uses each line once.
    const used = ctx.loop ? usedPatterns.has(pattern.id) : usedLines.has(pattern.line);
    if (used || visit.index === pattern.stops.length - 1) continue;

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

      const near = ctx.loop && ctx.nearOrigin(stop.stopId);
      const backSec = ctx.loop && !near ? backFrom(ctx, stop.stopId) : 0;
      if (alightElapsedSec + backSec > maxSec) continue; // a loop that cannot get back in time

      const finishes = alightElapsedSec >= minSec && (!ctx.loop || near);
      const transfers = !isLastLeg && canTransferAt(network, stop.stopId, pattern, ctx.loop);
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
        finished: finishes,
        backSec,
      });
    }
  }
  return children;
}

/**
 * The best open states, diversified so the beam is not filled with near-copies:
 * normal rides keep a few per last variant, loops keep one per end stop group.
 */
function selectBeam(states: State[], cmp: (a: State, b: State) => number, ctx: Context): State[] {
  const cap = ctx.loop ? 1 : ctx.opts.maxStatesPerPattern;
  const perKey = new Map<string, number>();
  const beam: State[] = [];
  for (const s of [...states].sort(cmp)) {
    const key = ctx.loop
      ? (ctx.groupOf(s.stopId) ?? s.stopId)
      : (s.legs[s.legs.length - 1]?.patternId ?? "");
    const n = perKey.get(key) ?? 0;
    if (n >= cap) continue;
    perKey.set(key, n + 1);
    beam.push(s);
    if (beam.length >= ctx.opts.beamWidth) break;
  }
  return beam;
}

function toRide(s: State, ctx: Context): Ride {
  const { originStopId, walkSec, legs, places, elapsedSec, score } = s;
  const endsAtStart = legs.length > 0 && ctx.nearOrigin(s.stopId);
  return { originStopId, walkSec, legs, places, elapsedSec, score, endsAtStart };
}

/**
 * Beam search for a sightseeing ride on trams and buses: up to `maxLegs - 1` transfers,
 * total time within [minBudgetShare, maxBudgetShare] × budget, maximising place scores.
 * With `returnToStart` the ride must end near the origin (a loop); `endsAtStart` on the
 * result says whether that worked. Returns null only when no stop is near the origin.
 */
export function planRide(input: SearchInput, options: Partial<SearchOptions> = {}): Ride | null {
  const base = { ...DEFAULT_SEARCH_OPTIONS, ...options };
  const loop = input.returnToStart === true;
  const opts = loop
    ? {
        ...base,
        maxLegs: base.loopMaxLegs,
        minBudgetShare: base.loopMinBudgetShare,
        beamWidth: base.loopBeamWidth,
      }
    : base;
  const cmp = byObjective(input.budgetSec, opts);

  let beam = originStates(input, opts);
  if (beam.length === 0) return null;

  const groupOf = (stopId: string) => input.network.stops.get(stopId)?.groupId;
  const originGroups = new Set(beam.map((s) => groupOf(s.stopId) ?? s.stopId));
  const ctx: Context = {
    opts,
    loop,
    minSec: opts.minBudgetShare * input.budgetSec,
    maxSec: opts.maxBudgetShare * input.budgetSec,
    groupOf,
    nearOrigin: (stopId) => {
      const stop = input.network.stops.get(stopId);
      return (
        !!stop &&
        (originGroups.has(stop.groupId) ||
          haversineM(stop.position, input.origin) <= opts.originRadiusM)
      );
    },
    returnTimes: loop
      ? computeReturnTimes(input.network, originGroups, opts.transferSec)
      : new Map(),
  };

  const finished: State[] = [];
  const partial: State[] = [];
  for (let depth = 0; depth < opts.maxLegs && beam.length > 0; depth++) {
    const open: State[] = [];
    for (const child of beam.flatMap((s) => expand(s, input, ctx))) {
      (child.finished ? finished : open).push(child);
    }
    partial.push(...open);
    beam = selectBeam(open, cmp, ctx);
  }

  const best = [...finished].sort(cmp)[0];
  if (best) return toRide(best, ctx);

  // Nothing fits the budget. A loop prefers the longest ride that still comes back;
  // otherwise the best ride over half the budget, else the longest one.
  const backHome = loop ? partial.filter((s) => ctx.nearOrigin(s.stopId)) : [];
  if (backHome.length > 0) {
    const longest = [...backHome].sort(
      (a, b) => b.elapsedSec - a.elapsedSec || b.score - a.score || a.key.localeCompare(b.key),
    )[0] as State;
    return toRide(longest, ctx);
  }
  const halfway = partial.filter((s) => s.elapsedSec >= input.budgetSec / 2);
  const fallback = [...(halfway.length > 0 ? halfway : partial)].sort(
    (a, b) => b.score - a.score || b.elapsedSec - a.elapsedSec || a.key.localeCompare(b.key),
  )[0];
  return fallback ? toRide(fallback, ctx) : null;
}
