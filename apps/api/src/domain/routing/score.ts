import { VISIBLE_RADIUS_M } from "./place-hits";
import type { PlacePoint } from "./types";

/** Extra value for each matching interest beyond the first. */
const EXTRA_MATCH_BONUS = 0.5;
/**
 * Value of a place that matches none of the chosen interests. Low enough that a rich
 * non-matching place (weight ~6) loses to a modest matching one (weight ~2).
 */
const NON_MATCH_FACTOR = 0.2;

/**
 * Value of passing a place: matching the chosen interests matters most, then richness;
 * places farther from the line count less (half at the edge of visibility).
 */
export function scorePlace(
  place: PlacePoint,
  distanceM: number,
  interests: ReadonlySet<string>,
): number {
  const matches = place.interests.filter((i) => interests.has(i)).length;
  const relevance = matches > 0 ? 1 + EXTRA_MATCH_BONUS * (matches - 1) : NON_MATCH_FACTOR;
  const proximity = 1 - Math.min(distanceM, VISIBLE_RADIUS_M) / (2 * VISIBLE_RADIUS_M);
  return place.weight * relevance * proximity;
}

/** Richness (facts + trivia) to a weight with diminishing returns. */
export function weightFromRichness(richness: number): number {
  return 1 + Math.log2(1 + Math.max(0, richness));
}
