import { readFileSync } from "node:fs";
import { PlaceSummaryCollectionSchema } from "@sawa/shared";
import type { Bbox } from "../../domain/routing/geometry";
import type { PlacesSource } from "../../services/ports";

type RawFeature = { geometry?: { coordinates?: unknown } };

function inBbox(feature: unknown, b: Bbox): boolean {
  const coords = (feature as RawFeature).geometry?.coordinates;
  if (!Array.isArray(coords)) return true; // let the parser decide and count it as skipped
  const [lng, lat] = coords as [number, number];
  return lng >= b.minLng && lng <= b.maxLng && lat >= b.minLat && lat <= b.maxLat;
}

/**
 * Places from a GeoJSON file in the `places_in_bbox` format (apps/api/data/places.geojson,
 * written by `pnpm --filter @sawa/scripts export:places`). Swap for a Supabase source later.
 */
export function createFilePlacesSource(path: string | URL): PlacesSource {
  const collection = PlaceSummaryCollectionSchema.parse(JSON.parse(readFileSync(path, "utf8")));
  return {
    async getPlacesInBbox(bbox) {
      return {
        type: "FeatureCollection",
        features: collection.features.filter((f) => inBbox(f, bbox)),
      };
    },
  };
}
