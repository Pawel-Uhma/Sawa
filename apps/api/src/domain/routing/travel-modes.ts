import type { Leg } from "@sawa/shared";
import { MIN_STORY_GAP_SEC, STORY_MAX_SEC } from "./select-stories";
import type { WalkOptions } from "./walk-tour";

/** Modes the planner tours on its own, from place to place along roads (#190, #191). */
export type WheelMode = "bike" | "car";

export type WheelProfile = {
  /** Average over a city ride, with crossings and lights. */
  speedMps: number;
  /** Roads are longer than a straight line. */
  detourFactor: number;
  /** `walkVisibleRadiusM` times this still counts as passed: higher and faster sees farther. */
  visibleRadiusScale: number;
  /**
   * Story gaps and lengths times this: places go by faster, so each story is shorter and the
   * next one can come sooner, and it ends before the place is left behind.
   */
  storyScale: number;
  /** Farthest the bbox of places reaches from the origin. */
  maxReachKm: number;
};

/**
 * Bike: about 15 km/h in town (Veturilo and own bikes alike). Car: about 25 km/h, Warsaw's
 * average inside the city with traffic; the places' bbox and the catchment are wider.
 */
export const WHEEL_PROFILES: Record<WheelMode, WheelProfile> = {
  bike: {
    speedMps: 4.2,
    detourFactor: 1.25,
    visibleRadiusScale: 2,
    storyScale: 0.75,
    maxReachKm: 15,
  },
  car: {
    speedMps: 7,
    detourFactor: 1.35,
    visibleRadiusScale: 4,
    storyScale: 0.5,
    maxReachKm: 30,
  },
};

/** No story gap gets shorter than this, however fast the ride. */
export const MIN_WHEEL_STORY_GAP_SEC = 20;

export function isWheelMode(mode: string | undefined): mode is WheelMode {
  return mode === "bike" || mode === "car";
}

/** Walk-tour options for touring on `mode` (the beam search over places, at its speed). */
export function wheelWalkOptions(mode: WheelMode): Partial<WalkOptions> {
  const p = WHEEL_PROFILES[mode];
  return {
    walkSpeedMps: p.speedMps,
    detourFactor: p.detourFactor,
    visibleRadiusScale: p.visibleRadiusScale,
  };
}

/** The radius scale for places passed on a leg of `mode` (1 on foot and on transit). */
export function visibleRadiusScaleOf(mode: Leg["mode"]): number {
  return isWheelMode(mode) ? WHEEL_PROFILES[mode].visibleRadiusScale : 1;
}

/**
 * Story gap and longest story on `mode`, from the style's values (defaults as for walks):
 * scaled by `storyScale`, the gap at least `MIN_WHEEL_STORY_GAP_SEC`, the longest at least it.
 */
export function wheelStoryTimes(
  mode: WheelMode,
  gapSec = MIN_STORY_GAP_SEC,
  maxSec = STORY_MAX_SEC.fun,
): { storyGapSec: number; storyMaxSec: number } {
  const { storyScale } = WHEEL_PROFILES[mode];
  const storyGapSec = Math.max(MIN_WHEEL_STORY_GAP_SEC, Math.round(gapSec * storyScale));
  return { storyGapSec, storyMaxSec: Math.max(storyGapSec, Math.round(maxSec * storyScale)) };
}

/** Kilometres a tour on `mode` may reach from the origin within `durationMin`. */
export function wheelReachKm(mode: WheelMode, durationMin: number): number {
  const p = WHEEL_PROFILES[mode];
  const straightKm = (durationMin * 60 * p.speedMps) / p.detourFactor / 1000;
  return Math.min(p.maxReachKm, Math.max(4, straightKm * 0.6));
}

/** Seconds on `mode` between two points (straight line × detour). */
export function wheelSec(mode: WheelMode, distanceM: number): number {
  const p = WHEEL_PROFILES[mode];
  return (distanceM * p.detourFactor) / p.speedMps;
}
