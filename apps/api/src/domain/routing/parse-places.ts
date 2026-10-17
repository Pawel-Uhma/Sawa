import { PlaceSummaryCollectionSchema, PlaceSummaryFeatureSchema } from "@sawa/shared";
import { weightFromRichness } from "./score";
import type { PlacePoint } from "./types";

/** GeoJSON in the `places_in_bbox` format → places for the planner. Invalid features are skipped. */
export function parsePlaces(geojson: unknown): { places: PlacePoint[]; skipped: number } {
  const collection = PlaceSummaryCollectionSchema.parse(geojson);
  const places: PlacePoint[] = [];
  let skipped = 0;
  for (const raw of collection.features) {
    const feature = PlaceSummaryFeatureSchema.safeParse(raw);
    if (!feature.success) {
      skipped++;
      continue;
    }
    const { geometry, properties } = feature.data;
    places.push({
      id: properties.id,
      name: properties.name,
      position: { lat: geometry.coordinates[1], lng: geometry.coordinates[0] },
      interests: properties.interests,
      weight: weightFromRichness(properties.richness),
    });
  }
  return { places, skipped };
}
