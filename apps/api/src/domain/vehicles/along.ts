import type { LatLng } from "@sawa/shared";
import { cumulativeDistancesM } from "../routing/geometry";
import type { LngLat, Pattern } from "../routing/types";
import type { AlongSample, VehicleHistory, VehicleOnPattern } from "./types";

const M_PER_DEG_LAT = 111_320;
/** GPS of ZTM vehicles is off by up to ~30 m; farther away the vehicle is on another street. */
export const MAX_OFF_SHAPE_M = 60;
/** Net movement that tells the direction; less is GPS noise at a stop. */
const MIN_MOVE_M = 50;
/** Direction is judged on this recent stretch, so a turn at the terminus counts quickly. */
const DIRECTION_WINDOW_MS = 3 * 60_000;
/** Shortest stretch of reports that tells the direction. */
const MIN_SPAN_MS = 15_000;
/** Backward jitter allowed inside one run of samples. */
const BACKSLIDE_M = 30;
/** A vehicle standing this close to the last stop has finished the pattern. */
const END_ZONE_M = 150;
/** A vehicle silent for longer is out of service. */
export const MAX_REPORT_AGE_MS = 3 * 60_000;

export type PatternGeometry = {
  pattern: Pattern;
  cumDistM: number[];
  lengthM: number;
};

export function toPatternGeometry(pattern: Pattern): PatternGeometry {
  const cumDistM = cumulativeDistancesM(pattern.lngLats);
  return { pattern, cumDistM, lengthM: cumDistM.at(-1) ?? 0 };
}

/**
 * Distance along the shape of the point closest to `point`, within `MAX_OFF_SHAPE_M`.
 * A shape can pass a street twice (out and back on one road); then the candidate
 * nearest the previous position wins, so the vehicle does not jump between the passes.
 */
export function projectNear(
  point: LatLng,
  geometry: PatternGeometry,
  previousAlongM?: number,
): number | undefined {
  const { lngLats } = geometry.pattern;
  const mPerDegLng = M_PER_DEG_LAT * Math.cos((point.lat * Math.PI) / 180);
  const toXY = ([lng, lat]: LngLat) =>
    [(lng - point.lng) * mPerDegLng, (lat - point.lat) * M_PER_DEG_LAT] as const;
  let best: { alongM: number; score: number } | undefined;
  for (let i = 0; i < lngLats.length - 1; i++) {
    const [ax, ay] = toXY(lngLats[i] as LngLat);
    const [bx, by] = toXY(lngLats[i + 1] as LngLat);
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq === 0 ? 0 : Math.min(1, Math.max(0, -(ax * dx + ay * dy) / lenSq));
    const offM = Math.hypot(ax + t * dx, ay + t * dy);
    if (offM > MAX_OFF_SHAPE_M) continue;
    const segStart = geometry.cumDistM[i] as number;
    const alongM = segStart + t * ((geometry.cumDistM[i + 1] as number) - segStart);
    const score = previousAlongM === undefined ? offM : Math.abs(alongM - previousAlongM);
    if (!best || score < best.score) best = { alongM, score };
  }
  return best?.alongM;
}

function projectSamples(history: VehicleHistory, geometry: PatternGeometry): AlongSample[] {
  const out: AlongSample[] = [];
  for (const s of history.samples) {
    const alongM = projectNear(s.position, geometry, out.at(-1)?.alongM);
    if (alongM !== undefined) out.push({ atMs: s.atMs, alongM });
  }
  return out;
}

/** The latest run of samples that moves forward, made monotone (GPS jitter removed). */
function forwardRun(samples: AlongSample[]): AlongSample[] {
  let start = samples.length - 1;
  while (start > 0) {
    const prev = samples[start - 1] as AlongSample;
    if (prev.alongM > (samples[start] as AlongSample).alongM + BACKSLIDE_M) break;
    start--;
  }
  let max = Number.NEGATIVE_INFINITY;
  return samples.slice(start).map((s) => {
    max = Math.max(max, s.alongM);
    return { atMs: s.atMs, alongM: max };
  });
}

/** The vehicle on the pattern, or undefined when it drives elsewhere, the other way or is silent. */
function onPattern(
  history: VehicleHistory,
  geometry: PatternGeometry,
  nowMs: number,
): VehicleOnPattern | undefined {
  const { pattern } = geometry;
  if (history.line !== pattern.line || history.mode !== pattern.mode) return undefined;
  const last = history.samples.at(-1);
  if (!last || nowMs - last.atMs > MAX_REPORT_AGE_MS) return undefined;
  const raw = projectSamples(history, geometry);
  const lastAlong = raw.at(-1);
  if (!lastAlong || lastAlong.atMs !== last.atMs) return undefined;
  const recent = raw.filter((s) => lastAlong.atMs - s.atMs <= DIRECTION_WINDOW_MS);
  const firstRecent = recent[0] as AlongSample;
  // One report cannot tell the direction (e.g. right after the API starts polling).
  if (lastAlong.atMs - firstRecent.atMs < MIN_SPAN_MS) return undefined;
  const netM = lastAlong.alongM - firstRecent.alongM;
  if (netM < -MIN_MOVE_M) return undefined;
  const standing = netM < MIN_MOVE_M;
  if (standing && lastAlong.alongM > geometry.lengthM - END_ZONE_M) return undefined;
  return { history, along: forwardRun(raw), standing };
}

/**
 * Vehicles of the pattern's line that drive this pattern's direction now (or stand on it).
 * Vehicles of the line going the other way, off the shape or silent are left out, and so is
 * one standing here that drives forward on a sibling (the line's other direction or variant):
 * a standing vehicle fits both directions of a two-way street.
 */
export function vehiclesOnPattern(
  histories: Iterable<VehicleHistory>,
  geometry: PatternGeometry,
  nowMs: number,
  siblings: PatternGeometry[] = [],
): VehicleOnPattern[] {
  const out: VehicleOnPattern[] = [];
  for (const history of histories) {
    const v = onPattern(history, geometry, nowMs);
    if (!v) continue;
    const elsewhere =
      v.standing &&
      siblings.some((g) => g !== geometry && onPattern(history, g, nowMs)?.standing === false);
    if (!elsewhere) out.push(v);
  }
  return out;
}
