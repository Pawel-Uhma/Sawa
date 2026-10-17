// Writes apps/api/data/places.geojson in the same shape as the Supabase RPC `places_in_bbox`
// (properties: id, name, kind, interests, richness), so the route planner can run on the file now
// and switch to Supabase later without changes. Uses R2's mapper, the same as the seed.
// Usage: pnpm --filter @sawa/scripts export:places

import { readFile, writeFile } from "node:fs/promises";
import type { PlaceSummaryFeature } from "@sawa/shared";
import { FeatureSchema, mapPlace } from "./historia/map-place";

const GEOJSON_PATH = new URL("../docs/historia/sawa-historia.geojson", import.meta.url);
const OUT_PATH = new URL("../apps/api/data/places.geojson", import.meta.url);

async function main() {
  const collection = JSON.parse(await readFile(GEOJSON_PATH, "utf8")) as { features: unknown[] };
  const now = new Date();
  const features: PlaceSummaryFeature[] = [];
  let skipped = 0;

  for (const raw of collection.features) {
    const parsed = FeatureSchema.safeParse(raw);
    if (!parsed.success) {
      skipped++;
      continue;
    }
    try {
      const row = mapPlace(parsed.data, now);
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: parsed.data.geometry.coordinates },
        properties: {
          id: row.id,
          name: row.name,
          kind: row.kind,
          interests: row.interests,
          richness: row.richness,
        },
      });
    } catch {
      skipped++;
    }
  }

  // Same order as places_in_bbox: richest first.
  features.sort((a, b) => b.properties.richness - a.properties.richness);
  await writeFile(OUT_PATH, `${JSON.stringify({ type: "FeatureCollection", features })}\n`);
  console.log(`${features.length} places → apps/api/data/places.geojson (${skipped} skipped)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
