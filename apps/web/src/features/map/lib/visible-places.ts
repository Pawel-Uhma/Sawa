import type { PlaceSummaryFeature } from "@sawa/shared";

export type PlaceFilter = {
  minRichness: number;
};

/** Places to draw: all of them, minus those below the richness threshold. Interests do not filter the map. */
export function selectVisiblePlaces(
  places: readonly PlaceSummaryFeature[],
  { minRichness }: PlaceFilter,
): PlaceSummaryFeature[] {
  return places.filter(({ properties: p }) => p.richness >= minRichness);
}
