// Downloads the city dataset "Otwarte boiska" (school sports grounds open to residents for free),
// geocodes school addresses with Nominatim, or Photon when Nominatim throttles (1 request/s) and writes
// docs/historia/um-otwarte-boiska.geojson for the seed and the planner export.
// The file is committed, so the seed stays repeatable without the token. Usage:
//   pnpm --filter @sawa/scripts fetch:boiska    # needs WAW_TOKEN in .env.local

import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { CITY_AREA, fetchWithRetry, inArea, sleep, USER_AGENT } from "./historia/http";
import { BoiskoRowSchema, geocodeQuery, groupBySchool, mapSchool } from "./historia/map-boiska";

const OUT_PATH = new URL("../docs/historia/um-otwarte-boiska.geojson", import.meta.url);
const ENDPOINT = "https://dane.um.warszawa.pl/api/action/get_be_otwarte_boiska";
// All 18 districts (names as in the dataset): the map covers the whole city.
// Warsaw's city limits (lon,lat,lon,lat), so Photon never answers with a street in another town.
const WARSAW_BBOX = "20.85,52.09,21.28,52.37";
const DISTRICTS = [
  "Wola",
  "Śródmieście",
  "Ochota",
  "Żoliborz",
  "Bemowo",
  "Mokotów",
  "Praga-Północ",
  "Praga-Południe",
  "Bielany",
  "Włochy",
  "Targówek",
  "Ursus",
  "Ursynów",
  "Wilanów",
  "Wawer",
  "Białołęka",
  "Wesoła",
  "Rembertów",
];

async function main() {
  const token = process.env.WAW_TOKEN;
  if (!token) throw new Error("Set WAW_TOKEN in .env.local (https://dane.um.warszawa.pl/key-api)");

  const res = await fetchWithRetry(ENDPOINT, { method: "POST", headers: { Authorization: token } });
  if (!res.ok) throw new Error(`otwarte boiska ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const rows = z.array(BoiskoRowSchema).parse(await res.json());
  const schools = groupBySchool(rows.filter((r) => DISTRICTS.includes(r.Dzielnica)));

  const known = await knownPositions();
  const features = [];
  let notFound = 0;
  for (const school of schools) {
    const id = mapSchool(school, { lat: 0, lng: 0 }).properties.id;
    let position = known.get(id) ?? null;
    if (!position) {
      position = await geocode(geocodeQuery(school.address));
      await sleep(1100); // Nominatim and Photon usage policy: at most 1 request per second
    }
    if (!position) {
      notFound++;
      console.warn(`not geocoded: ${school.address}`);
      continue;
    }
    if (inArea(position.lat, position.lng, CITY_AREA)) features.push(mapSchool(school, position));
  }

  await writeFile(
    OUT_PATH,
    `${JSON.stringify({ type: "FeatureCollection", features }, null, 1)}\n`,
  );
  console.log(
    `${rows.length} rows → ${schools.length} schools in ${DISTRICTS.join(", ")} → ${features.length} in area ${JSON.stringify(CITY_AREA)} (${notFound} not geocoded)`,
  );
}

/** Positions from the previous run, so a rerun geocodes only new addresses. */
async function knownPositions(): Promise<Map<string, { lat: number; lng: number }>> {
  const text = await readFile(OUT_PATH, "utf8").catch(() => null);
  if (!text) return new Map();
  const { features } = JSON.parse(text) as {
    features: { geometry: { coordinates: [number, number] }; properties: { id: string } }[];
  };
  return new Map(
    features.map((f) => [
      f.properties.id,
      { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] },
    ]),
  );
}

// Nominatim answers 429 to shared networks (the venue); Photon (komoot, also OSM) then takes over.
let nominatimBlocked = false;

async function geocode(q: string): Promise<{ lat: number; lng: number } | null> {
  if (!nominatimBlocked) {
    const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q, format: "json", limit: "1", countrycodes: "pl" })}`;
    const res = await fetchWithRetry(url, { headers: { "User-Agent": USER_AGENT } });
    if (res.ok) {
      const [hit] = (await res.json()) as { lat: string; lon: string }[];
      return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
    }
    if (res.status !== 429) throw new Error(`nominatim ${res.status} for ${q}`);
    console.warn("nominatim 429, switching to photon");
    nominatimBlocked = true;
  }
  const url = `https://photon.komoot.io/api/?${new URLSearchParams({ q, limit: "1", bbox: WARSAW_BBOX })}`;
  const res = await fetchWithRetry(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`photon ${res.status} for ${q}`);
  const [hit] = ((await res.json()) as { features: { geometry: { coordinates: number[] } }[] })
    .features;
  const [lng, lat] = hit?.geometry.coordinates ?? [];
  return lat !== undefined && lng !== undefined ? { lat, lng } : null;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
