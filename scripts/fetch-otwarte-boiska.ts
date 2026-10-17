// Downloads the city dataset "Otwarte boiska" (school sports grounds open to residents for free),
// geocodes school addresses with Nominatim (1 request/s) and writes
// docs/historia/um-otwarte-boiska.geojson for the seed and the planner export.
// The file is committed, so the seed stays repeatable without the token. Usage:
//   pnpm --filter @sawa/scripts fetch:boiska    # needs WAW_TOKEN in .env.local

import { writeFile } from "node:fs/promises";
import { z } from "zod";
import { AREA, fetchWithRetry, inArea, sleep, USER_AGENT } from "./historia/http";
import { BoiskoRowSchema, geocodeQuery, groupBySchool, mapSchool } from "./historia/map-boiska";

const OUT_PATH = new URL("../docs/historia/um-otwarte-boiska.geojson", import.meta.url);
const ENDPOINT = "https://dane.um.warszawa.pl/api/action/get_be_otwarte_boiska";
// Districts that overlap AREA; the rest is skipped before geocoding.
const DISTRICTS = ["Wola", "Śródmieście", "Ochota", "Żoliborz", "Bemowo"];

async function main() {
  const token = process.env.WAW_TOKEN;
  if (!token) throw new Error("Set WAW_TOKEN in .env.local (https://dane.um.warszawa.pl/key-api)");

  const res = await fetchWithRetry(ENDPOINT, { method: "POST", headers: { Authorization: token } });
  if (!res.ok) throw new Error(`otwarte boiska ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const rows = z.array(BoiskoRowSchema).parse(await res.json());
  const schools = groupBySchool(rows.filter((r) => DISTRICTS.includes(r.Dzielnica)));

  const features = [];
  let notFound = 0;
  for (const school of schools) {
    const position = await geocode(geocodeQuery(school.address));
    await sleep(1100); // Nominatim usage policy: at most 1 request per second
    if (!position) {
      notFound++;
      console.warn(`not geocoded: ${school.address}`);
      continue;
    }
    if (inArea(position.lat, position.lng)) features.push(mapSchool(school, position));
  }

  await writeFile(
    OUT_PATH,
    `${JSON.stringify({ type: "FeatureCollection", features }, null, 1)}\n`,
  );
  console.log(
    `${rows.length} rows → ${schools.length} schools in ${DISTRICTS.join(", ")} → ${features.length} in area ${JSON.stringify(AREA)} (${notFound} not geocoded)`,
  );
}

async function geocode(q: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q, format: "json", limit: "1", countrycodes: "pl" })}`;
  const res = await fetchWithRetry(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`nominatim ${res.status} for ${q}`);
  const [hit] = (await res.json()) as { lat: string; lon: string }[];
  return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
