import { type Interest, interestsOfTags, type PlaceSummaryFeature } from "@sawa/shared";

export type PlaceFilter = {
  /** Categories picked by the user; empty = no filter. */
  interests: readonly Interest[];
  minRichness: number;
};

/** Places to draw: rich enough and, when a filter is set, in any selected category (OR). */
export function selectVisiblePlaces(
  places: readonly PlaceSummaryFeature[],
  { interests, minRichness }: PlaceFilter,
): PlaceSummaryFeature[] {
  return places.filter(({ properties: p }) => {
    if (p.richness < minRichness) return false;
    if (interests.length === 0) return true;
    return interestsOfTags(p.interests).some((interest) => interests.includes(interest));
  });
}
