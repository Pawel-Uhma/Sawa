import { haversineM, type LatLng } from "@sawa/shared";
import { computeReturnTimes } from "./return-times";
import { type ScorePrefs, scorePlace } from "./score";
import type { Network, Pattern, PatternStop, PlaceHit, PlacePoint } from "./types";

export type SearchInput = {
  network: Network;
  hitsByPattern: Map<string, PlaceHit[]>;
  placesById: Map<string, PlacePoint>;
  origin: LatLng;
  budgetSec: number;
  interests: ReadonlySet<string>;
  /** Onboarding preferences (tiles, familiarity) for place scores. */
  prefs?: ScorePrefs;
  /** Loop: the ride must end at a stop near the origin. */
  returnToStart?: boolean;
  /** The ride must end at a stop near this point (ignored with `returnToStart`). */
  destination?: LatLng;
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
  /** Rides with a fixed end (loop or destination) need one more leg and may end earlier. */
  loopMaxLegs: number;
  loopMinBudgetShare: number;
  /** Rides with a fixed end keep at most one ride per end stop group, in a wider beam. */
  loopBeamWidth: number;
  /** Shortest ride on one leg: shorter legs only add waiting to fill the budget. */
  minLegRideSec: number;
  /** Transfers may walk this far to another stop group (straight line). */
  walkTransferM: number;
  /**
   * Cost of riding again between stops already ridden (either way), per budget share: going
   * back the same way shows nothing new, so a loop prefers another way back when one exists.
   */
  backtrackPenalty: number;
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
  minLegRideSec: 180,
  walkTransferM: 300,
  backtrackPenalty: 2,
};

export type ChosenLeg = {
  patternId: string;
  boardIndex: number;
  alightIndex: number;
  boardElapsedSec: number;
  alightElapsedSec: number;
  /** Boarding time comes from the ZTM timetable, not from the half-headway estimate. */
  realDeparture?: boolean;
  /** Live delay of the vehicle to board (seconds, from its position), already in the times. */
  delaySec?: number;
  /** Walk from the previous leg's stop to another stop group before boarding (transfer). */
  walkBeforeSec?: number;
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
  /** Only with a destination: the last stop is near it. */
  endsAtDestination?: boolean;
};

type State = Omit<Ride, "endsAtStart" | "endsAtDestination"> & {
  stopId: string;
  visited: ReadonlySet<string>;
  key: string;
  finished: boolean;
  /** Fixed end: time still needed to reach the end point (0 otherwise). */
  backSec: number;
  /** Seconds ridden between stop groups the ride already passed between (backtracking). */
  retracedSec: number;
};

/** Per-search settings shared by every expansion. */
type Context = {
  opts: SearchOptions;
  /** The ride must end near a given point: the origin (loop) or the destination. */
  fixedEnd: boolean;
  /** A loop may come back on a line it already used; other rides use each line once. */
  loop: boolean;
  minSec: number;
  maxSec: number;
  groupOf: (stopId: string) => string | undefined;
  nearOrigin: (stopId: string) => boolean;
  nearEnd: (stopId: string) => boolean;
  /** Seconds on foot from a stop to the end point (0 without one). */
  walkToEnd: (stopId: string) => number;
  /** Other stop groups within walking distance for a transfer, with the walk in seconds. */
  nearbyGroups: (groupId: string) => NearbyGroup[];
  /** Fixed end: seconds to the end point per stop group (see return-times.ts). */
  endTimes: Map<string, number>;
  /** First leg: the only stops to board each variant at (see originBoardings), null for any. */
  originBoard: ReadonlySet<string> | null;
};

const transfersOf = (s: State) => Math.max(0, s.legs.length - 1);

/** Higher is better. With a fixed end the expected total includes the time to reach it. */
function objective(s: State, budgetSec: number, opts: SearchOptions): number {
  const budgetMiss = Math.abs(s.elapsedSec + s.backSec - budgetSec) / budgetSec;
  const retraced = s.retracedSec / budgetSec;
  return (
    s.score - opts.transferPenalty * transfersOf(s) - budgetMiss - opts.backtrackPenalty * retraced
  );
}

/** Deterministic order: best objective, then fewer transfers, then key. */
function byObjective(budgetSec: number, opts: SearchOptions) {
  return (a: State, b: State) =>
    objective(b, budgetSec, opts) - objective(a, budgetSec, opts) ||
    transfersOf(a) - transfersOf(b) ||
    a.key.localeCompare(b.key);
}

/** The closest stops within walking distance of `point`. */
function stopsNear(network: Network, point: LatLng, opts: SearchOptions) {
  return [...network.stops.values()]
    .map((stop) => ({ stop, distanceM: haversineM(point, stop.position) }))
    .filter(({ distanceM }) => distanceM <= opts.originRadiusM)
    .sort((a, b) => a.distanceM - b.distanceM || a.stop.id.localeCompare(b.stop.id))
    .slice(0, opts.maxOriginStops);
}

function originStates(input: SearchInput, opts: SearchOptions): State[] {
  return stopsNear(input.network, input.origin, opts).map(({ stop, distanceM }) => {
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
      retracedSec: 0,
    };
  });
}

/**
 * First-leg boardings as `patternId:index`: each variant at its stop closest on foot to the
 * origin. Walking to another stop of the same variant (on to board it later, or back to ride
 * past the origin) only fills the budget with a walk.
 */
function originBoardings(network: Network, origins: State[]): Set<string> {
  const walkByGroup = new Map<string, number>();
  for (const s of origins) {
    const group = network.stops.get(s.stopId)?.groupId ?? s.stopId;
    walkByGroup.set(group, Math.min(walkByGroup.get(group) ?? Infinity, s.walkSec));
  }
  const best = new Map<string, { index: number; walkSec: number }>();
  for (const [group, walkSec] of walkByGroup) {
    for (const { patternId, index } of network.visitsByGroup.get(group) ?? []) {
      const pattern = network.patterns.get(patternId);
      if (!pattern || index === pattern.stops.length - 1) continue; // terminus
      const b = best.get(patternId);
      if (!b || walkSec < b.walkSec || (walkSec === b.walkSec && index < b.index)) {
        best.set(patternId, { index, walkSec });
      }
    }
  }
  return new Set([...best].map(([patternId, { index }]) => `${patternId}:${index}`));
}

/**
 * Whether another leg can start at this stop group: a different line, or in a loop also
 * another variant of the same line (turning back the way you came).
 */
function canTransferAt(
  network: Network,
  groupIds: string[],
  pattern: Pattern,
  loop: boolean,
): boolean {
  return groupIds.some((groupId) =>
    (network.visitsByGroup.get(groupId) ?? []).some((v) =>
      loop ? v.patternId !== pattern.id : network.patterns.get(v.patternId)?.line !== pattern.line,
    ),
  );
}

type NearbyGroup = { groupId: string; walkSec: number };

const groupsCache = new WeakMap<Pattern, ReadonlySet<string>>();

/** Stop groups a pattern calls at. */
function groupsOf(network: Network, pattern: Pattern): ReadonlySet<string> {
  let groups = groupsCache.get(pattern);
  if (!groups) {
    groups = new Set(pattern.stops.flatMap((s) => network.stops.get(s.stopId)?.groupId ?? []));
    groupsCache.set(pattern, groups);
  }
  return groups;
}

/**
 * Stop groups worth walking to after riding `pattern`: near `groupId` but not served by the
 * pattern itself (there the rider would simply stay on).
 */
function walkTransfers(ctx: Context, network: Network, groupId: string, pattern: Pattern) {
  const served = groupsOf(network, pattern);
  return ctx.nearbyGroups(groupId).filter((n) => !served.has(n.groupId));
}
/** Per network and radius: computed once, the network never changes. */
const nearbyCache = new WeakMap<Network, Map<string, Map<string, NearbyGroup[]>>>();

/** Stop groups within `radiusM` of each group (by its first platform), cached per network. */
function nearbyGroupsOf(network: Network, radiusM: number, walkSpeedMps: number) {
  const key = `${radiusM}:${walkSpeedMps}`;
  const byKey = nearbyCache.get(network) ?? new Map<string, Map<string, NearbyGroup[]>>();
  nearbyCache.set(network, byKey);
  const cached = byKey.get(key);
  if (cached) return cached;
  const positions = new Map<string, LatLng>();
  for (const stop of network.stops.values()) {
    if (!positions.has(stop.groupId)) positions.set(stop.groupId, stop.position);
  }
  // Grid cells about `radiusM` wide, so only neighbouring cells are compared.
  const cellDeg = radiusM / 111_320;
  const cellOf = (p: LatLng) => [Math.floor(p.lat / cellDeg), Math.floor(p.lng / (cellDeg * 1.6))];
  const cells = new Map<string, string[]>();
  for (const [groupId, p] of positions) {
    const key = cellOf(p).join(",");
    cells.set(key, [...(cells.get(key) ?? []), groupId]);
  }
  const result = new Map<string, NearbyGroup[]>();
  for (const [groupId, p] of positions) {
    const [cy, cx] = cellOf(p) as [number, number];
    const near: NearbyGroup[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (const other of cells.get(`${cy + dy},${cx + dx}`) ?? []) {
          if (other === groupId) continue;
          const distanceM = haversineM(p, positions.get(other) as LatLng);
          if (distanceM <= radiusM)
            near.push({ groupId: other, walkSec: distanceM / walkSpeedMps });
        }
      }
    }
    result.set(groupId, near);
  }
  byKey.set(key, result);
  return result;
}

/**
 * Boarding `pattern` at `boardIndex` goes back along `leg`: the next stop is one the leg
 * already passed. Riding on in the same direction on another variant is only a wait.
 */
function turnsBack(network: Network, leg: ChosenLeg, pattern: Pattern, boardIndex: number) {
  const next = pattern.stops[boardIndex + 1];
  const nextGroup = next && network.stops.get(next.stopId)?.groupId;
  const ridden = network.patterns.get(leg.patternId)?.stops.slice(leg.boardIndex, leg.alightIndex);
  return (
    leg.patternId !== pattern.id &&
    !!nextGroup &&
    (ridden ?? []).some((s) => network.stops.get(s.stopId)?.groupId === nextGroup)
  );
}

/** A hop between two stop groups, the same key in both directions. */
const hopKey = (a: string, b: string) => (a < b ? `${a}~${b}` : `${b}~${a}`);

/** Hops between consecutive stop groups on every leg of the ride so far. */
function riddenHops(network: Network, legs: ChosenLeg[]): Set<string> {
  const hops = new Set<string>();
  for (const leg of legs) {
    const stops = network.patterns.get(leg.patternId)?.stops ?? [];
    for (let i = leg.boardIndex + 1; i <= leg.alightIndex; i++) {
      const a = network.stops.get(stops[i - 1]?.stopId ?? "")?.groupId;
      const b = network.stops.get(stops[i]?.stopId ?? "")?.groupId;
      if (a && b && a !== b) hops.add(hopKey(a, b));
    }
  }
  return hops;
}

function timeToEnd(ctx: Context, stopId: string): number {
  const group = ctx.groupOf(stopId);
  const sec = group === undefined ? undefined : ctx.endTimes.get(group);
  return sec ?? Number.POSITIVE_INFINITY; // unknown group or no way to the end
}

/**
 * A later stop of `pattern` near the end, closer to it on foot than stop `j` and still in time:
 * getting off at `j` and walking the rest only fills the budget with a walk.
 */
function closerLaterStop(
  ctx: Context,
  pattern: Pattern,
  j: number,
  offsetSec: number,
  walkSec: number,
): boolean {
  for (let k = j + 1; k < pattern.stops.length; k++) {
    const stop = pattern.stops[k] as PatternStop;
    if (offsetSec + stop.atSec > ctx.maxSec) return false;
    if (!ctx.nearEnd(stop.stopId)) continue;
    const walk = ctx.walkToEnd(stop.stopId);
    if (walk < walkSec && offsetSec + stop.atSec + walk <= ctx.maxSec) return true;
  }
  return false;
}

/** Every ride that extends `state` by one leg and ends where it can finish or transfer. */
function expand(state: State, input: SearchInput, ctx: Context): State[] {
  const { network } = input;
  const { opts, minSec, maxSec } = ctx;
  const groupId = ctx.groupOf(state.stopId);
  const isLastLeg = state.legs.length + 1 >= opts.maxLegs;
  const legIndex = state.legs.length;
  const children: State[] = [];
  const ridden = riddenHops(network, state.legs);
  // Board here, or after a transfer also at a stop group a short walk away.
  const lastLeg = state.legs[legIndex - 1];
  const lastPattern = lastLeg && network.patterns.get(lastLeg.patternId);
  const boardings = groupId
    ? [
        { groupId, walkSec: 0 },
        ...(lastPattern ? walkTransfers(ctx, network, groupId, lastPattern) : []),
      ]
    : [];
  const visits = boardings.flatMap(({ groupId: g, walkSec }) =>
    (network.visitsByGroup.get(g) ?? []).map((visit) => ({ ...visit, walkSec })),
  );

  for (const visit of visits) {
    const pattern = network.patterns.get(visit.patternId) as Pattern;
    const board = pattern.stops[visit.index] as PatternStop;
    // A loop may come back on a line it already used (the same tram the other way);
    // any other ride uses each line once.
    const sameLine = state.legs.filter(
      (l) => network.patterns.get(l.patternId)?.line === pattern.line,
    );
    const used = ctx.loop
      ? sameLine.some((l) => !turnsBack(network, l, pattern, visit.index))
      : sameLine.length > 0;
    if (used || visit.index === pattern.stops.length - 1) continue;
    const firstBoard = `${pattern.id}:${visit.index}`;
    if (legIndex === 0 && ctx.originBoard && !ctx.originBoard.has(firstBoard)) continue;

    const waitSec = pattern.headwaySec / 2 + (legIndex > 0 ? opts.transferSec + visit.walkSec : 0);
    const boardElapsedSec = state.elapsedSec + waitSec;
    const hits = input.hitsByPattern.get(pattern.id) ?? [];
    let hitIndex = hits.findIndex((h) => h.atSec > board.atSec);
    if (hitIndex < 0) hitIndex = hits.length;

    let gain = 0;
    let retracedSec = state.retracedSec;
    const gained: CollectedPlace[] = [];

    for (let j = visit.index + 1; j < pattern.stops.length; j++) {
      const stop = pattern.stops[j] as PatternStop;
      const alightElapsedSec = boardElapsedSec + stop.atSec - board.atSec;
      if (alightElapsedSec > maxSec) break;
      const prev = pattern.stops[j - 1] as PatternStop;
      const fromGroup = ctx.groupOf(prev.stopId);
      const toGroup = ctx.groupOf(stop.stopId);
      if (fromGroup && toGroup && ridden.has(hopKey(fromGroup, toGroup))) {
        retracedSec += stop.atSec - prev.atSec;
      }

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
        const score = scorePlace(place, hit.distanceM, input.interests, input.prefs);
        gain += score;
        gained.push({
          placeId: hit.placeId,
          etaSec: boardElapsedSec + hit.atSec - board.atSec,
          distanceM: hit.distanceM,
          legIndex,
          score,
        });
      }

      if (stop.atSec - board.atSec < opts.minLegRideSec) continue; // e.g. a terminus loop
      const near = ctx.fixedEnd && ctx.nearEnd(stop.stopId);
      // Near the end only the walk is left; otherwise the estimated ride there.
      const backSec = !ctx.fixedEnd
        ? 0
        : near
          ? ctx.walkToEnd(stop.stopId)
          : timeToEnd(ctx, stop.stopId);
      if (alightElapsedSec + backSec > maxSec) continue; // cannot reach the end in time

      // On a free ride, a transfer that waits longer than it rides only fills the time. Loops
      // and rides to a destination may need short legs to get there (or out and back).
      if (!ctx.fixedEnd && legIndex > 0 && stop.atSec - board.atSec < waitSec) continue;

      const finishes =
        alightElapsedSec + backSec >= minSec &&
        (!ctx.fixedEnd ||
          (near && !closerLaterStop(ctx, pattern, j, boardElapsedSec - board.atSec, backSec)));
      const alightGroup = ctx.groupOf(stop.stopId);
      const transfers =
        !isLastLeg &&
        !!alightGroup &&
        canTransferAt(
          network,
          [alightGroup, ...walkTransfers(ctx, network, alightGroup, pattern).map((n) => n.groupId)],
          pattern,
          ctx.loop,
        );
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
            ...(visit.walkSec > 0 ? { walkBeforeSec: visit.walkSec } : {}),
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
        retracedSec,
      });
    }
  }
  return children;
}

/**
 * The best open states, diversified so the beam is not filled with near-copies:
 * free rides keep a few per last variant (one per stop it ends at), rides with a fixed end
 * one per end stop group.
 */
function selectBeam(states: State[], cmp: (a: State, b: State) => number, ctx: Context): State[] {
  const cap = ctx.fixedEnd ? 1 : ctx.opts.maxStatesPerPattern;
  const groupOf = (s: State) => ctx.groupOf(s.stopId) ?? s.stopId;
  const patternOf = (s: State) => s.legs[s.legs.length - 1]?.patternId ?? "";
  // Near-copies (the same variant to the same stop, boarded elsewhere): keep the one with more
  // places, then the one that gets there first and so has more time left.
  const candidates = ctx.fixedEnd
    ? states
    : bestPerEnd(states, (s) => `${patternOf(s)}>${groupOf(s)}`);
  const perKey = new Map<string, number>();
  const beam: State[] = [];
  for (const s of [...candidates].sort(cmp)) {
    const key = ctx.fixedEnd ? groupOf(s) : patternOf(s);
    const n = perKey.get(key) ?? 0;
    if (n >= cap) continue;
    perKey.set(key, n + 1);
    beam.push(s);
    if (beam.length >= ctx.opts.beamWidth) break;
  }
  return beam;
}

function bestPerEnd(states: State[], endOf: (s: State) => string): State[] {
  const best = new Map<string, State>();
  for (const s of states) {
    const key = endOf(s);
    const b = best.get(key);
    const better =
      !b ||
      s.score > b.score ||
      (s.score === b.score && s.elapsedSec < b.elapsedSec) ||
      (s.score === b.score && s.elapsedSec === b.elapsedSec && s.key < b.key);
    if (better) best.set(key, s);
  }
  return [...best.values()];
}

function toRide(s: State, ctx: Context, input: SearchInput): Ride {
  const { originStopId, walkSec, legs, places, elapsedSec, score } = s;
  const endsAtStart = legs.length > 0 && ctx.nearOrigin(s.stopId);
  const ride: Ride = { originStopId, walkSec, legs, places, elapsedSec, score, endsAtStart };
  if (input.destination && !input.returnToStart) {
    ride.endsAtDestination = legs.length > 0 && ctx.nearEnd(s.stopId);
  }
  return ride;
}

/**
 * Beam search for a sightseeing ride on trams and buses: up to `maxLegs - 1` transfers,
 * total time within [minBudgetShare, maxBudgetShare] × budget, maximising place scores.
 * With `returnToStart` the ride must end near the origin (a loop), with `destination` near
 * that point; `endsAtStart` / `endsAtDestination` on the result say whether that worked.
 * A destination farther than the budget allows stretches the budget to the fastest ride
 * there; one that no ride reaches is dropped. Returns null only when no stop is near the origin.
 * Each line is boarded at its stop closest to the origin, unless that leaves no ride at all.
 */
export function planRide(input: SearchInput, options: Partial<SearchOptions> = {}): Ride | null {
  return search(input, options, true) ?? search(input, options, false);
}

function search(
  input: SearchInput,
  options: Partial<SearchOptions>,
  strictOrigin: boolean,
): Ride | null {
  const base = { ...DEFAULT_SEARCH_OPTIONS, ...options };
  const end = input.returnToStart ? input.origin : input.destination;
  const fixedEnd = end !== undefined;
  const opts = fixedEnd
    ? {
        ...base,
        maxLegs: base.loopMaxLegs,
        minBudgetShare: base.loopMinBudgetShare,
        beamWidth: base.loopBeamWidth,
      }
    : base;

  let beam = originStates(input, opts);
  if (beam.length === 0) return null;

  const { network } = input;
  const groupOf = (stopId: string) => network.stops.get(stopId)?.groupId;
  const originGroups = new Set(beam.map((s) => groupOf(s.stopId) ?? s.stopId));
  const endGroups =
    end === undefined || input.returnToStart
      ? originGroups
      : new Set(stopsNear(network, end, opts).map(({ stop }) => stop.groupId));
  const near = (groups: ReadonlySet<string>, point: LatLng) => (stopId: string) => {
    const stop = network.stops.get(stopId);
    return (
      !!stop && (groups.has(stop.groupId) || haversineM(stop.position, point) <= opts.originRadiusM)
    );
  };
  const endTimes = fixedEnd
    ? computeReturnTimes(network, endGroups, opts.transferSec)
    : new Map<string, number>();

  let budgetSec = input.budgetSec;
  if (fixedEnd) {
    // A loop's fastest ride is the walk to the stop, so only a destination can be out of reach.
    const fastestSec = Math.min(
      ...beam.map((s) => s.walkSec + (endTimes.get(groupOf(s.stopId) ?? "") ?? Infinity)),
    );
    if (!Number.isFinite(fastestSec)) {
      const free = planRide({ ...input, returnToStart: false, destination: undefined }, options);
      return free && { ...free, endsAtDestination: false };
    }
    budgetSec = Math.max(budgetSec, fastestSec);
  }

  const cmp = byObjective(budgetSec, opts);
  const ctx: Context = {
    opts,
    fixedEnd,
    loop: input.returnToStart === true,
    minSec: opts.minBudgetShare * budgetSec,
    maxSec: opts.maxBudgetShare * budgetSec,
    groupOf,
    nearOrigin: near(originGroups, input.origin),
    nearEnd: end ? near(endGroups, end) : () => false,
    nearbyGroups: (g) =>
      nearbyGroupsOf(network, opts.walkTransferM, opts.walkSpeedMps).get(g) ?? [],
    walkToEnd: (stopId) => {
      const stop = network.stops.get(stopId);
      return end && stop ? haversineM(stop.position, end) / opts.walkSpeedMps : 0;
    },
    endTimes,
    originBoard: strictOrigin ? originBoardings(network, beam) : null,
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
  if (best) return toRide(best, ctx, input);

  // Nothing fits the budget. With a fixed end prefer the longest ride that still gets there;
  // otherwise the best ride over half the budget, else the longest one.
  const atEnd = fixedEnd ? partial.filter((s) => ctx.nearEnd(s.stopId)) : [];
  if (atEnd.length > 0) {
    const longest = [...atEnd].sort(
      (a, b) => b.elapsedSec - a.elapsedSec || b.score - a.score || a.key.localeCompare(b.key),
    )[0] as State;
    return toRide(longest, ctx, input);
  }
  const halfway = partial.filter((s) => s.elapsedSec >= budgetSec / 2);
  const fallback = [...(halfway.length > 0 ? halfway : partial)].sort(
    (a, b) => b.score - a.score || b.elapsedSec - a.elapsedSec || a.key.localeCompare(b.key),
  )[0];
  return fallback ? toRide(fallback, ctx, input) : null;
}
