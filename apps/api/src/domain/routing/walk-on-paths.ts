import type { LatLng } from "@sawa/shared";
import type { CollectedPlace } from "./beam-search";
import {
  bboxAround,
  cumulativeDistancesM,
  isInBbox,
  projectOnPolyline,
  slicePolyline,
} from "./geometry";
import { type ScorePrefs, scorePlace } from "./score";
import type { LngLat, PlacePoint } from "./types";
import {
  DEFAULT_WALK_OPTIONS,
  isLoop,
  RETRACE_M,
  RETRACE_STEP_M,
  roundness,
  WALK_LARGE_VISIBLE_RADIUS_M,
  type Walk,
  type WalkOptions,
  walkVisibleRadiusM,
} from "./walk-tour";

/** Walking paths run along street centrelines; places on the pavement are a few metres farther. */
export const PATH_SLACK_M = 10;

export type PathScoring = { interests: ReadonlySet<string>; prefs?: ScorePrefs };

export type PathSpan = {
  /** Seconds since the request at the start of the path, and for walking all of it. */
  startSec: number;
  sec: number;
  legIndex: number;
  /** Points walked to on purpose: places there count however far the path snapped from them. */
  walkedTo: LatLng[];
  skip?: ReadonlySet<string>;
};

/**
 * Places right by `path` (`walkVisibleRadiusM` + `PATH_SLACK_M`) and places walked to, each
 * timed by its share of the path's length.
 */
export function placesAlongPath(
  places: Iterable<PlacePoint>,
  path: LngLat[],
  { startSec, sec, legIndex, walkedTo, skip }: PathSpan,
  { interests, prefs }: PathScoring,
): CollectedPlace[] {
  const walkedToKeys = new Set(walkedTo.map((p) => `${p.lng},${p.lat}`));
  const cumDistM = cumulativeDistancesM(path);
  const totalM = cumDistM[cumDistM.length - 1] ?? 0;
  const bbox = bboxAround(path, WALK_LARGE_VISIBLE_RADIUS_M + PATH_SLACK_M);
  const passed: CollectedPlace[] = [];
  for (const place of places) {
    if (skip?.has(place.id)) continue;
    const isWalkedTo = walkedToKeys.has(`${place.position.lng},${place.position.lat}`);
    if (!isWalkedTo && !isInBbox(place.position, bbox)) continue;
    const { distanceM, alongM } = projectOnPolyline(place.position, path, cumDistM);
    if (!isWalkedTo && distanceM > walkVisibleRadiusM(place) + PATH_SLACK_M) continue;
    passed.push({
      placeId: place.id,
      etaSec: startSec + (totalM > 0 ? alongM / totalM : 0) * sec,
      distanceM,
      legIndex,
      score: scorePlace(place, distanceM, interests, prefs),
    });
  }
  return passed;
}

/**
 * Metres of `path` that go back along the way walked before (within `RETRACE_M`): out to a
 * place and back the same street. The stretch just walked is skipped, since every point of the
 * path is next to it.
 */
export function retracedPathM(path: LngLat[]): number {
  const cumDistM = cumulativeDistancesM(path);
  const totalM = cumDistM[cumDistM.length - 1] ?? 0;
  let retracedM = 0;
  for (let m = 2 * RETRACE_M + RETRACE_STEP_M; m <= totalM; m += RETRACE_STEP_M) {
    const [lng, lat] = slicePolyline(path, cumDistM, m, m)[0] as LngLat;
    const before = slicePolyline(path, cumDistM, 0, m - 2 * RETRACE_M);
    const { distanceM } = projectOnPolyline({ lat, lng }, before, cumulativeDistancesM(before));
    if (distanceM <= RETRACE_M) retracedM += RETRACE_STEP_M;
  }
  return retracedM;
}

/**
 * When no walk fits the time, walks this much longer than the shortest still compete: seconds
 * apart matter less than the places passed.
 */
const NEAR_SHORTEST = 1.05;

export type WalkOnPath = { walk: Walk; path?: LngLat[] };

/**
 * Of walks planned on straight lines, the best one along its real path: the places the path
 * passes, its length at walking speed and the stretches walked back the same way, weighed like
 * `planWalk` does (a loop also by how round its path is). Only walks that fit `maxBudgetShare` × budget count; when none does,
 * the ones near the shortest (`NEAR_SHORTEST`). The walk gets the path's places and time. Undefined when no walk has a path.
 */
export function pickWalkOnPaths(
  walks: WalkOnPath[],
  input: PathScoring & {
    places: Iterable<PlacePoint>;
    budgetSec: number;
    origin?: LatLng;
    end?: LatLng;
  },
  options: Partial<WalkOptions> = {},
): Walk | undefined {
  const opts = { ...DEFAULT_WALK_OPTIONS, ...options };
  if (input.budgetSec <= 0) return undefined;
  const places = [...input.places];
  const maxSec = opts.maxBudgetShare * input.budgetSec;
  const roundnessBonus =
    input.origin && isLoop(input.origin, input.end) ? opts.loopRoundnessBonus : 0;
  const scored = walks.flatMap(({ walk, path }) => {
    if (!path || path.length < 2) return [];
    const cumDistM = cumulativeDistancesM(path);
    const sec = (cumDistM[cumDistM.length - 1] ?? 0) / opts.walkSpeedMps;
    const passed = placesAlongPath(
      places,
      path,
      { startSec: 0, sec, legIndex: 0, walkedTo: walk.waypoints.slice(1) },
      input,
    );
    const score = passed.reduce((sum, p) => sum + p.score, 0);
    const retracedSec = retracedPathM(path) / opts.walkSpeedMps;
    const objective =
      score -
      Math.abs(sec - input.budgetSec) / input.budgetSec -
      (opts.backtrackPenalty * retracedSec) / input.budgetSec +
      (roundnessBonus > 0
        ? roundnessBonus * roundness(path.map(([lng, lat]) => ({ lat, lng })))
        : 0);
    return [{ walk: { ...walk, places: passed, elapsedSec: sec, score }, objective }];
  });
  const shortestSec = Math.min(...scored.map((s) => s.walk.elapsedSec));
  const limitSec = shortestSec <= maxSec ? maxSec : shortestSec * NEAR_SHORTEST;
  const best = scored
    .filter((s) => s.walk.elapsedSec <= limitSec)
    .reduce<(typeof scored)[number] | undefined>(
      (a, b) => (!a || b.objective > a.objective ? b : a),
      undefined,
    );
  return best?.walk;
}
