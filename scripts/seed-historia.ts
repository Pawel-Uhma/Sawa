// Loads docs/historia/*.geojson (historia/sources.ts) into Supabase (places, place_photos).
// Idempotent: upserts by places.id and (place_id, url). Usage:
//   pnpm --filter @sawa/scripts seed:historia            # needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   pnpm --filter @sawa/scripts seed:historia --dry-run  # map and report only

import { PLACE_TAGS } from "@sawa/shared";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  FeatureSchema,
  mapPhotos,
  mapPlace,
  type PhotoRow,
  type PlaceRow,
} from "./historia/map-place";
import { readSourceFeatures } from "./historia/sources";

const BATCH = 100;

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const features = await readSourceFeatures();

  const now = new Date();
  const places: PlaceRow[] = [];
  const photos: PhotoRow[] = [];
  for (const [i, raw] of features.entries()) {
    const parsed = FeatureSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn(`skip feature #${i}: ${z.prettifyError(parsed.error)}`);
      continue;
    }
    try {
      places.push(mapPlace(parsed.data, now));
      photos.push(...mapPhotos(parsed.data));
    } catch (err) {
      console.warn(`skip feature #${i}: ${(err as Error).message}`);
    }
  }

  report(places, photos, features.length);
  if (dryRun) return;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  const db = createClient(url, key, { auth: { persistSession: false } });

  for (let i = 0; i < places.length; i += BATCH) {
    const { error } = await db.from("places").upsert(places.slice(i, i + BATCH));
    if (error) throw new Error(`places batch ${i}: ${error.message}`);
  }
  for (let i = 0; i < photos.length; i += BATCH) {
    const { error } = await db
      .from("place_photos")
      .upsert(photos.slice(i, i + BATCH), { onConflict: "place_id,url" });
    if (error) throw new Error(`photos batch ${i}: ${error.message}`);
  }
  console.log(`upserted ${places.length} places, ${photos.length} photos`);
}

function report(places: PlaceRow[], photos: PhotoRow[], total: number) {
  const count = (values: string[]) =>
    Object.fromEntries([...new Set(values)].map((v) => [v, values.filter((x) => x === v).length]));
  console.log(`features: ${total}, places: ${places.length}, photos: ${photos.length}`);
  console.log("kinds:", count(places.map((p) => p.kind)));
  console.log(
    "interests:",
    Object.fromEntries(
      PLACE_TAGS.map((k) => [k, places.filter((p) => p.interests.includes(k)).length]),
    ),
  );
  console.log("without interests:", places.filter((p) => p.interests.length === 0).length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
