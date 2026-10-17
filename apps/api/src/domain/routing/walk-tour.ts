import { haversineM, type LatLng } from "@sawa/shared";
import type { CollectedPlace } from "./beam-search";
import { type ScorePrefs, scorePlace } from "./score";
import type { PlacePoint } from "./types";

export type WalkInput = {
  places: PlacePoint[];
  origin: LatLng;
  /** Where the walk must end (origin for a loop, the destination); free when missing. */
  end?: LatLng;
  budgetSec: number;
  interests: ReadonlySet<string>;
  prefs?: ScorePrefs;
};

export type WalkOptions = {
  walkSpeedMps: number;
  /** Streets are longer than a straight line. */
  detourFactor: number;
  beamWidth: number;
  /** Most places walked to in turn (others are passed on the way). */
  maxStops: number;
  /** Best-scoring reachable places considered as stops. */
  maxCandidates: number;
  maxBudgetShare: number;
  /** Cost of walking back along the way already walked, per budget share (see beam search). */
  backtrackPenalty: number;
};

export const DEFAULT_WALK_OPTIONS: WalkOptions = {
  walkSpeedMps: 1.2,
  detourFactor: 1.3,
  beamWidth: 8,
  maxStops: 8,
  maxCandidates: 40,
  maxBudgetShare: 1.1,
  backtrackPenalty: 2,
};

export type Walk = {
  /** Origin, the places walked to, then the end (if any). */
  waypoints: LatLng[];
  /** Places passed, `legIndex` 0, `etaSec` from the start of the walk. */
  places: CollectedPlace[];
  elapsedSec: number;
  score: number;
  /** The place the walk ends at, when it has no fixed end. */
  lastPlaceId?: string;
};

type State = Walk & {
  at: LatLng;
  visited: ReadonlySet<string>;
  key: string;
  /** Seconds walked along segments walked before (going back the same way). */
  retracedSec: number;
};

const M_PER_DEG_LAT = 111_320;

/** Distance from `p` to segment a→b and how far along it (0–1) the closest point is. */
export function toSegment(p: LatLng, a: LatLng, b: LatLng): { distanceM: number; t: number } {
  const kx = M_PER_DEG_LAT * Math.cos((a.lat * Math.PI) / 180);
  const [bx, by] = [(b.lng - a.lng) * kx, (b.lat - a.lat) * M_PER_DEG_LAT];
  const [px, py] = [(p.lng - a.lng) * kx, (p.lat - a.lat) * M_PER_DEG_LAT];
  const len2 = bx * bx + by * by;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / len2));
  return { distanceM: Math.hypot(px - t * bx, py - t * by), t };
}

/** A walk this close to a segment walked before goes along it again. */
const RETRACE_M = 30;
/** Sample spacing along a new segment when checking it against the way so far. */
const RETRACE_STEP_M = 20;

/**
 * Share (0–1) of the straight walk `from` → `to` that runs within `RETRACE_M` of the walk
 * through `waypoints`. The first stretch is skipped: every turn starts next to the last segment.
 */
export function retracedShare(waypoints: LatLng[], from: LatLng, to: LatLng): number {
  const lengthM = haversineM(from, to);
  const samples = Math.floor(lengthM / RETRACE_STEP_M);
  if (samples === 0 || waypoints.length < 2) return 0;
  let near = 0;
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    if (t * lengthM < 2 * RETRACE_M) continue;
    const p = { lat: from.lat + t * (to.lat - from.lat), lng: from.lng + t * (to.lng - from.lng) };
    for (let k = 1; k < waypoints.length; k++) {
      if (toSegment(p, waypoints[k - 1] as LatLng, waypoints[k] as LatLng).distanceM <= RETRACE_M) {
        near++;
        break;
      }
    }
  }
  return near / samples;
}

/** A turn back this close (degrees) to the way just walked goes back along the same street. */
const TURN_BACK_FULL_DEG = 25;
/** From this angle on, the new way is a different street. */
const TURN_BACK_NONE_DEG = 60;

/**
 * Metres of `at` → `to` walked back along `prev` → `at` when the walk turns sharply back.
 * Straight lines of such a narrow V stay apart, so `retracedShare` misses it, but on the map
 * both arms run along the same street (the walk goes to a place and back the same way).
 */
export function turnBackM(prev: LatLng, at: LatLng, to: LatLng): number {
  const backM = haversineM(at, prev);
  const nextM = haversineM(at, to);
  if (backM === 0 || nextM === 0) return 0;
  const kx = M_PER_DEG_LAT * Math.cos((at.lat * Math.PI) / 180);
  const [bx, by] = [(prev.lng - at.lng) * kx, (prev.lat - at.lat) * M_PER_DEG_LAT];
  const [nx, ny] = [(to.lng - at.lng) * kx, (to.lat - at.lat) * M_PER_DEG_LAT];
  const cos = (bx * nx + by * ny) / (Math.hypot(bx, by) * Math.hypot(nx, ny));
  const angle = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
  if (angle >= TURN_BACK_NONE_DEG) return 0;
  const share =
    angle <= TURN_BACK_FULL_DEG
      ? 1
      : (TURN_BACK_NONE_DEG - angle) / (TURN_BACK_NONE_DEG - TURN_BACK_FULL_DEG);
  return share * Math.min(backM, nextM);
}

/**
 * On foot only places right by the way count: the walker passes next to them, not across the
 * street or a block away (a ride sees farther, see `VISIBLE_RADIUS_M`).
 */
export const WALK_VISIBLE_RADIUS_M = 15;
/**
 * A building, church, cemetery or square: its point is the middle, often 40–60 m from the
 * pavement, and the walker passes by the whole of it.
 */
export const WALK_LARGE_VISIBLE_RADIUS_M = 50;
const LARGE_KINDS: ReadonlySet<string> = new Set(["building", "church", "cemetery", "site"]);

/** How far from a walk `place` still counts as passed right by it. */
export function walkVisibleRadiusM(place: PlacePoint): number {
  return place.kind && LARGE_KINDS.has(place.kind)
    ? WALK_LARGE_VISIBLE_RADIUS_M
    : WALK_VISIBLE_RADIUS_M;
}
/** A place this far off a direct walk is worth a short detour to pass right by it. */
export const WALK_DETOUR_M = 60;
/** Detours make a direct walk at most this share longer. */
export const WALK_DETOUR_SHARE = 0.2;
/** Best places near a direct walk tried as detours. */
const MAX_DETOURS = 20;

export type Segment = { from: LatLng; to: LatLng; startSec: number; sec: number };

/** Places right by a straight walk (`walkVisibleRadiusM`), with the time each is passed (`legIndex` 0). */
export function placesAlong(
  places: Iterable<PlacePoint>,
  { from, to, startSec, sec }: Segment,
  scoring: { interests: ReadonlySet<string>; prefs?: ScorePrefs; skip?: ReadonlySet<string> },
): CollectedPlace[] {
  const gained: CollectedPlace[] = [];
  for (const place of places) {
    if (scoring.skip?.has(place.id)) continue;
    const { distanceM, t } = toSegment(place.position, from, to);
    if (distanceM > walkVisibleRadiusM(place)) continue;
    const score = scorePlace(place, distanceM, scoring.interests, scoring.prefs);
    gained.push({ placeId: place.id, etaSec: startSec + t * sec, distanceM, legIndex: 0, score });
  }
  return gained;
}

export type DirectWalk = { waypoints: LatLng[]; places: CollectedPlace[]; sec: number };

/**
 * A walk `from` → `to` bent slightly through the best places within `WALK_DETOUR_M` of the
 * straight line (all detours at most `WALK_DETOUR_SHARE` longer), so the walker passes right by
 * them. Places right by any of its segments count, with the time each is passed.
 */
export function walkThrough(
  places: Iterable<PlacePoint>,
  from: LatLng,
  to: LatLng,
  secPerM: number,
  scoring: { interests: ReadonlySet<string>; prefs?: ScorePrefs; skip?: ReadonlySet<string> },
): DirectWalk {
  const all = [...places];
  const near: { place: PlacePoint; t: number; score: number }[] = [];
  for (const place of all) {
    if (scoring.skip?.has(place.id)) continue;
    const { distanceM, t } = toSegment(place.position, from, to);
    if (distanceM <= walkVisibleRadiusM(place) || distanceM > WALK_DETOUR_M) continue;
    near.push({ place, t, score: scorePlace(place, 0, scoring.interests, scoring.prefs) });
  }
  near.sort((a, b) => b.score - a.score || a.place.id.localeCompare(b.place.id));

  const lengthM = (points: LatLng[]) =>
    points.reduce((sum, p, i) => (i === 0 ? 0 : sum + haversineM(points[i - 1] as LatLng, p)), 0);
  const maxM = (1 + WALK_DETOUR_SHARE) * haversineM(from, to);
  let detours: typeof near = [];
  for (const candidate of near.slice(0, MAX_DETOURS)) {
    const tried = [...detours, candidate].sort((a, b) => a.t - b.t);
    if (lengthM([from, ...tried.map((d) => d.place.position), to]) <= maxM) detours = tried;
  }

  const waypoints = [from, ...detours.map((d) => d.place.position), to];
  const skip = new Set(scoring.skip);
  const passed: CollectedPlace[] = [];
  let sec = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const [a, b] = [waypoints[i - 1] as LatLng, waypoints[i] as LatLng];
    const segmentSec = haversineM(a, b) * secPerM;
    const gained = placesAlong(
      all,
      { from: a, to: b, startSec: sec, sec: segmentSec },
      {
        ...scoring,
        skip,
      },
    );
    for (const g of gained) skip.add(g.placeId);
    passed.push(...gained);
    sec += segmentSec;
  }
  return { waypoints, places: passed, sec };
}

/**
 * A short sightseeing walk: beam search over places near the origin, walking straight from
 * one to the next (× detour factor). Places right by each segment count, scored like
 * on a ride. With `end` the walk finishes there; the result fits `maxBudgetShare` × budget.
 * Returns null when not even the walk to the end fits.
 */
export function planWalk(input: WalkInput, options: Partial<WalkOptions> = {}): Walk | null {
  const opts = { ...DEFAULT_WALK_OPTIONS, ...options };
  const maxSec = opts.maxBudgetShare * input.budgetSec;
  const secBetween = (a: LatLng, b: LatLng) =>
    (haversineM(a, b) * opts.detourFactor) / opts.walkSpeedMps;
  const toEnd = (p: LatLng) => (input.end ? secBetween(p, input.end) : 0);
  if (toEnd(input.origin) > maxSec) return null;

  // Places that can be reached and still leave time to get to the end.
  const reachable = input.places.filter(
    (p) => secBetween(input.origin, p.position) + toEnd(p.position) <= maxSec,
  );
  const candidates = [...reachable]
    .sort(
      (a, b) =>
        scorePlace(b, 0, input.interests, input.prefs) -
          scorePlace(a, 0, input.interests, input.prefs) || a.id.localeCompare(b.id),
    )
    .slice(0, opts.maxCandidates);

  /**
   * `state` extended by walking straight to `to`, collecting places passed. The stretch that
   * goes back the way already walked passes nothing new: after a sharp turn back the walker is
   * on the same street, so places by the straight line there are skipped, and elsewhere the
   * places' score drops with the share walked again.
   */
  function walkTo(state: State, to: LatLng, key: string): State {
    const sec = secBetween(state.at, to);
    const lengthM = haversineM(state.at, to);
    const prev = state.waypoints[state.waypoints.length - 2];
    const backM = prev && lengthM > 0 ? turnBackM(prev, state.at, to) : 0;
    const againShare = Math.max(
      retracedShare(state.waypoints, state.at, to),
      lengthM > 0 ? backM / lengthM : 0,
    );
    const gained = placesAlong(
      reachable,
      { from: state.at, to, startSec: state.elapsedSec, sec },
      {
        interests: input.interests,
        prefs: input.prefs,
        skip: state.visited,
      },
    ).filter((g) => sec === 0 || ((g.etaSec - state.elapsedSec) / sec) * lengthM >= backM);
    const visited = new Set(state.visited);
    for (const g of gained) visited.add(g.placeId);
    const retracedSec = state.retracedSec + sec * againShare;
    const gainedScore = gained.reduce((sum, g) => sum + g.score, 0);
    return {
      waypoints: [...state.waypoints, to],
      places: [...state.places, ...gained],
      elapsedSec: state.elapsedSec + sec,
      score: state.score + gainedScore * (1 - againShare),
      at: to,
      visited,
      key: `${state.key}|${key}`,
      lastPlaceId: key === "end" ? undefined : key,
      retracedSec,
    };
  }

  const finish = (s: State) => (input.end ? walkTo(s, input.end, "end") : s);
  const objective = (s: State) =>
    s.score -
    Math.abs(s.elapsedSec - input.budgetSec) / input.budgetSec -
    (opts.backtrackPenalty * s.retracedSec) / input.budgetSec;
  const byObjective = (a: State, b: State) =>
    objective(b) - objective(a) || a.key.localeCompare(b.key);

  const start: State = {
    waypoints: [input.origin],
    places: [],
    elapsedSec: 0,
    score: 0,
    at: input.origin,
    visited: new Set(),
    key: "start",
    retracedSec: 0,
  };
  const done: State[] = [finish(start)];
  let beam = [start];
  for (let depth = 0; depth < opts.maxStops && beam.length > 0; depth++) {
    const open: State[] = [];
    for (const state of beam) {
      for (const place of candidates) {
        if (state.visited.has(place.id)) continue;
        if (
          state.elapsedSec + secBetween(state.at, place.position) + toEnd(place.position) >
          maxSec
        ) {
          continue;
        }
        const next = walkTo(state, place.position, place.id);
        open.push(next);
        done.push(finish(next));
      }
    }
    beam = open.sort(byObjective).slice(0, opts.beamWidth);
  }

  const best = done.sort(byObjective)[0] as State;
  const { waypoints, places, elapsedSec, score, lastPlaceId } = best;
  return { waypoints, places, elapsedSec, score, ...(lastPlaceId ? { lastPlaceId } : {}) };
}
