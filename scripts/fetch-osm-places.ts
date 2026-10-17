// Downloads named parks, gardens and sports grounds in Warsaw from OSM (Overpass), only landmarks
// outside WIDE_AREA (isOuterLandmark),
// adds the Wikipedia lead paragraph when OSM links one, and writes
// docs/historia/osm-sport-przyroda.geojson for the seed and the planner export.
// The file is committed, so the seed stays repeatable offline. Usage:
//   pnpm --filter @sawa/scripts fetch:osm

import { readFile, writeFile } from "node:fs/promises";
import type { PlaceTag } from "@sawa/shared";
import { z } from "zod";
import { CITY_AREA, fetchWithRetry, inArea, sleep, USER_AGENT, WIDE_AREA } from "./historia/http";
import {
  dedupeByName,
  isOuterLandmark,
  mapOsmElement,
  type OsmElement,
  OsmElementSchema,
  osmPosition,
  osmTag,
  type WikiSummary,
  wikiLeadsFromQuery,
  wikiTitle,
} from "./historia/map-osm";

const HISTORIA_PATH = new URL("../docs/historia/sawa-historia.geojson", import.meta.url);
const OUT_PATH = new URL("../docs/historia/osm-sport-przyroda.geojson", import.meta.url);
const BBOX = `${CITY_AREA.south},${CITY_AREA.west},${CITY_AREA.north},${CITY_AREA.east}`;
// The main instance sometimes fails with a dispatcher error; the mirror serves the same data.
const OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

// `bb` instead of `center`: the bounding box gives the size (MIN_GREEN_M2) and the same centre.
const QUERY = `[out:json][timeout:90];
(
  nwr["leisure"~"^(park|garden)$"]["name"](${BBOX});
  nwr["leisure"~"^(pitch|sports_centre|stadium|track|fitness_station)$"]["name"](${BBOX});
);
out tags bb;`;

async function main() {
  const elements = await overpass();

  const tagged = elements
    .map((el) => ({ el, tag: osmTag(el) }))
    .filter((x): x is { el: OsmElement; tag: PlaceTag } => x.tag !== null)
    // Stadiums and parks before pitches, so a duplicate keeps the better element.
    .sort((a, b) => rank(a.el) - rank(b.el))
    .map((x) => ({
      ...x,
      name: x.el.tags.name ?? "",
      ...(osmPosition(x.el) ?? { lat: 0, lng: 0 }),
    }))
    .filter((x) => inArea(x.lat, x.lng, WIDE_AREA) || isOuterLandmark(x.el, x.tag));

  const curated = await curatedNames();
  const kept = dedupeByName([...curated, ...tagged]).filter((x) => "el" in x) as typeof tagged;

  const titles = kept.map((x) => wikiTitle(x.el.tags.wikipedia)).filter((t) => t !== null);
  const leads = await wikiLeads([...new Set(titles)]);
  const features = kept
    .map(({ el, tag }) => mapOsmElement(el, tag, leads.get(wikiTitle(el.tags.wikipedia) ?? "")))
    .filter((f) => f !== null);

  await writeFile(
    OUT_PATH,
    `${JSON.stringify({ type: "FeatureCollection", features }, null, 1)}\n`,
  );
  const count = (tag: PlaceTag) => features.filter((f) => f.properties.tagi.includes(tag)).length;
  console.log(
    `${elements.length} OSM elements → ${features.length} places (nature ${count("nature")}, sport ${count("sport")}, with Wikipedia ${features.filter((f) => f.properties.pewnosc === "wysoka").length})`,
  );
}

async function overpass(): Promise<OsmElement[]> {
  let error = "";
  for (const url of OVERPASS) {
    const res = await fetchWithRetry(url, {
      method: "POST",
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      body: new URLSearchParams({ data: QUERY }),
    });
    // A failing instance can answer 200 with an HTML error page.
    if (res.ok && res.headers.get("content-type")?.includes("json")) {
      return z.object({ elements: z.array(OsmElementSchema) }).parse(await res.json()).elements;
    }
    error = `${url} ${res.status}: ${(await res.text()).slice(0, 200)}`;
    console.warn(error);
  }
  throw new Error(`Overpass failed: ${error}`);
}

function rank(el: OsmElement): number {
  return ["stadium", "park", "garden", "sports_centre"].indexOf(el.tags.leisure ?? "") + 1 || 9;
}

/** Curated places come first in deduplication, so OSM never repeats them. */
async function curatedNames() {
  const collection = JSON.parse(await readFile(HISTORIA_PATH, "utf8")) as {
    features: { geometry: { coordinates: [number, number] }; properties: { nazwa: string } }[];
  };
  return collection.features.map((f) => ({
    name: f.properties.nazwa,
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }));
}

/** Lead paragraphs for `wikipedia=pl:…` tags, 20 titles per request (the TextExtracts limit). */
async function wikiLeads(titles: string[]): Promise<Map<string, WikiSummary>> {
  const leads = new Map<string, WikiSummary>();
  for (let i = 0; i < titles.length; i += 20) {
    const params = new URLSearchParams({
      action: "query",
      prop: "extracts|info",
      inprop: "url",
      exintro: "1",
      explaintext: "1",
      exlimit: "20",
      redirects: "1",
      format: "json",
      formatversion: "2",
      titles: titles.slice(i, i + 20).join("|"),
    });
    const body = await wikiGet(`https://pl.wikipedia.org/w/api.php?${params}`);
    for (const [title, lead] of wikiLeadsFromQuery(body)) leads.set(title, lead);
    await sleep(1000);
  }
  for (const title of titles) if (!leads.has(title)) console.warn(`no wikipedia lead: ${title}`);
  return leads;
}

/** Wikipedia rate-limits bursts (429) longer than fetchWithRetry waits, so back off further. */
async function wikiGet(url: string): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetchWithRetry(url, { headers: { "User-Agent": USER_AGENT } });
    if (res.ok) return res.json();
    if (res.status !== 429 || attempt >= 3) throw new Error(`wikipedia ${res.status}: ${url}`);
    console.warn("wikipedia 429, waiting a minute");
    await sleep(60_000);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
