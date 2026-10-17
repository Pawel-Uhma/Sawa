import { readFileSync } from "node:fs";
import type { PlacesRepository } from "../../services/ports";
import { toPlaceSummaries } from "../supabase/place-mappers";

/**
 * Places from a GeoJSON file in the `places_in_bbox` format (apps/api/data/places.geojson,
 * written by `pnpm --filter @sawa/scripts export:places`). Only `listInBBox`: enough for the
 * route planner until it reads Supabase through the full repository.
 */
export function createFilePlacesRepository(
  path: string | URL,
): Pick<PlacesRepository, "listInBBox"> {
  const places = toPlaceSummaries(JSON.parse(readFileSync(path, "utf8")));
  return {
    async listInBBox(bbox, interests) {
      return places.filter(
        ({ position: { lat, lng }, interests: own }) =>
          lng >= bbox.minLng &&
          lng <= bbox.maxLng &&
          lat >= bbox.minLat &&
          lat <= bbox.maxLat &&
          (!interests?.length || own.some((i) => interests.includes(i))),
      );
    },
  };
}
