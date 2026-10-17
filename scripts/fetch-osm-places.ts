// Downloads named parks, gardens and sports grounds around the curated places from OSM (Overpass),
// adds the Wikipedia lead paragraph when OSM links one, and writes
// docs/historia/osm-sport-przyroda.geojson for the seed and the planner export.
// The file is committed, so the seed stays repeatable offline. Usage:
//   pnpm --filter @sawa/scripts fetch:osm

import { readFile, writeFile } from "node:fs/promises";
import type { PlaceTag } from "@sawa/shared";
import { z } from "zod";
import { AREA, fetchWithRetry, sleep, USER_AGENT } from "./historia/http";
import {
  dedupeByName,
  mapOsmElement,
  type OsmElement,
  OsmElementSchema,
  osmTag,
  type WikiSummary,
} from "./historia/map-osm";

const HISTORIA_PATH = new URL("../docs/historia/sawa-historia.geojson", import.meta.url);
const OUT_PATH = new URL("../docs/historia/osm-sport-przyroda.geojson", import.meta.url);
const BBOX = `${AREA.south},${AREA.west},${AREA.north},${AREA.east}`;
const OVERPASS = "https://overpass-api.de/api/interpreter";

const QUERY = `[out:json][timeout:60];
(
  nwr["leisure"~"^(park|garden)$"]["name"](${BBOX});
  nwr["leisure"~"^(pitch|sports_centre|stadium|track|fitness_station)$"]["name"](${BBOX});
);
out center tags;`;

async function main() {
  const res = await fetchWithRetry(OVERPASS, {
    method: "POST",
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    body: new URLSearchParams({ data: QUERY }),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const elements = z
    .object({ elements: z.array(OsmElementSchema) })
    .parse(await res.json()).elements;

  const tagged = elements
    .map((el) => ({ el, tag: osmTag(el) }))
    .filter((x): x is { el: OsmElement; tag: PlaceTag } => x.tag !== null)
    // Stadiums and parks before pitches, so a duplicate keeps the better element.
    .sort((a, b) => rank(a.el) - rank(b.el))
    .map((x) => ({
      ...x,
      name: x.el.tags.name ?? "",
      lat: x.el.lat ?? x.el.center?.lat ?? 0,
      lng: x.el.lon ?? x.el.center?.lon ?? 0,
    }));

  const curated = await curatedNames();
  const kept = dedupeByName([...curated, ...tagged]).filter((x) => "el" in x) as typeof tagged;

  const features: NonNullable<ReturnType<typeof mapOsmElement>>[] = [];
  for (const { el, tag } of kept) {
    const wiki = await wikiSummary(el.tags.wikipedia);
    if (el.tags.wikipedia) await sleep(500);
    const feature = mapOsmElement(el, tag, wiki);
    if (feature) features.push(feature);
  }

  await writeFile(
    OUT_PATH,
    `${JSON.stringify({ type: "FeatureCollection", features }, null, 1)}\n`,
  );
  const count = (tag: PlaceTag) => features.filter((f) => f.properties.tagi.includes(tag)).length;
  console.log(
    `${elements.length} OSM elements → ${features.length} places (nature ${count("nature")}, sport ${count("sport")}, with Wikipedia ${features.filter((f) => f.properties.pewnosc === "wysoka").length})`,
  );
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

/** `wikipedia=pl:Ogród Saski w Warszawie` → lead paragraph from the REST API. */
async function wikiSummary(tag: string | undefined): Promise<WikiSummary | undefined> {
  const match = tag?.match(/^pl:(.+)$/);
  if (!match?.[1]) return undefined;
  const title = match[1];
  const url = `https://pl.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replaceAll(" ", "_"))}`;
  const res = await fetchWithRetry(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    console.warn(`wikipedia ${res.status}: ${title}`);
    return undefined;
  }
  const body = (await res.json()) as {
    title: string;
    extract?: string;
    content_urls?: { desktop?: { page?: string } };
  };
  if (!body.extract) return undefined;
  return {
    title: body.title,
    extract: body.extract,
    url:
      body.content_urls?.desktop?.page ??
      `https://pl.wikipedia.org/wiki/${encodeURIComponent(title)}`,
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
