import type { CollectedPlace } from "./beam-search";

/** Shortest time Sawa gets for one place; denser places are dropped, not crammed in. */
export const MIN_STORY_GAP_SEC = 45;

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
