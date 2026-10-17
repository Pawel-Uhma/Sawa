import type { StoryStyle } from "@sawa/shared";
import type { CollectedPlace } from "./beam-search";

/** Shortest time Sawa gets for one place; denser places are dropped, not crammed in. */
export const MIN_STORY_GAP_SEC = 45;

/** The shortest gap per story style: one-line trivia fits often, detailed stories need room. */
export const STORY_GAP_SEC: Record<StoryStyle, number> = {
  trivia: 30,
  fun: MIN_STORY_GAP_SEC,
  deep: 90,
};

/** The longest a story may run per style, however long until the next place. */
export const STORY_MAX_SEC: Record<StoryStyle, number> = {
  trivia: 60,
  fun: 120,
  deep: 300,
};

/**
 * How long Sawa may talk about a place: until the next one, at least `minSec` (also at the
 * end of the route, while the user arrives) and at most `maxSec`.
 */
export function storyWindowSec(untilNextSec: number, minSec: number, maxSec: number): number {
  return Math.round(Math.min(maxSec, Math.max(untilNextSec, minSec)));
}

/**
 * Picks the places Sawa talks about: best score first, each at least `minGapSec` from every
 * place already picked. Returned in ride order. Route choice still counts every place passed.
 */
export function selectStoryPlaces(
  places: CollectedPlace[],
  minGapSec = MIN_STORY_GAP_SEC,
): CollectedPlace[] {
  const picked: CollectedPlace[] = [];
  const byScore = [...places].sort(
    (a, b) => b.score - a.score || a.etaSec - b.etaSec || a.placeId.localeCompare(b.placeId),
  );
  for (const place of byScore) {
    if (picked.every((p) => Math.abs(p.etaSec - place.etaSec) >= minGapSec)) picked.push(place);
  }
  return picked.sort((a, b) => a.etaSec - b.etaSec);
}
