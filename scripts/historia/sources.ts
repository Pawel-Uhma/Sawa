// GeoJSON files read by the seed and the planner export, in the docs/historia format.

import { readFile } from "node:fs/promises";

export const SOURCE_FILES = [
  new URL("../../docs/historia/sawa-historia.geojson", import.meta.url),
  // Parks and sports grounds from OSM, written by `pnpm --filter @sawa/scripts fetch:osm`.
  new URL("../../docs/historia/osm-sport-przyroda.geojson", import.meta.url),
  // School sports grounds from the city dataset, written by `pnpm --filter @sawa/scripts fetch:boiska`.
  new URL("../../docs/historia/um-otwarte-boiska.geojson", import.meta.url),
  // Monuments, churches, museums and theatres with a Wikipedia article, `fetch:osm-historia` (T-73).
  new URL("../../docs/historia/osm-historia.geojson", import.meta.url),
];

export async function readSourceFeatures(): Promise<unknown[]> {
  const features: unknown[] = [];
  for (const file of SOURCE_FILES) {
    const collection = JSON.parse(await readFile(file, "utf8")) as { features: unknown[] };
    features.push(...collection.features);
  }
  return features;
}
