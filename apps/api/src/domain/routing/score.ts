import { VISIBLE_RADIUS_M } from "./place-hits";
import type { PlacePoint } from "./types";

const INTEREST_BONUS = 1.5;

/**
 * Value of passing a place: richer places and matching interests count more,
 * places farther from the line count less (half at the edge of visibility).
 */
export function scorePlace(
  place: PlacePoint,
  distanceM: number,
  interests: ReadonlySet<string>,
): number {
  const matches = place.interests.filter((i) => interests.has(i)).length;
  const proximity = 1 - Math.min(distanceM, VISIBLE_RADIUS_M) / (2 * VISIBLE_RADIUS_M);
  return place.weight * (1 + INTEREST_BONUS * matches) * proximity;
}

/** Richness (facts + trivia) to a weight with diminishing returns. */
export function weightFromRichness(richness: number): number {
  return 1 + Math.log2(1 + Math.max(0, richness));
}
