import type { PlaceSummaryFeature } from "@sawa/shared";

export type PlaceFilter = {
  /** User interests; empty = no filter. */
  interests: readonly string[];
  minRichness: number;
};

/** Places to draw: matching any selected interest (OR) and rich enough. */
export function selectVisiblePlaces(
  places: readonly PlaceSummaryFeature[],
  { interests, minRichness }: PlaceFilter,
): PlaceSummaryFeature[] {
  return places.filter(({ properties: p }) => {
    if (p.richness < minRichness) return false;
    if (interests.length === 0) return true;
    return p.interests.some((interest) => interests.includes(interest));
  });
}
