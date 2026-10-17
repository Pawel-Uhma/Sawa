// Downloads monuments, churches, museums, theatres and other notable objects with a Polish
// Wikipedia article in Warsaw (CITY_AREA) from OSM (Overpass), adds the article lead, and writes
// docs/historia/osm-historia.geojson for the seed and the planner export (T-73).
// The file is committed, so the seed stays repeatable offline. Usage:
//   pnpm --filter @sawa/scripts fetch:osm-historia
//   pnpm --filter @sawa/scripts fetch:osm-historia --fast  # keep the current file, add new places
//                                                           # with a long lead only (minutes, not 30+)

import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { AREA, CITY_AREA, fetchWithRetry, inArea, sleep, USER_AGENT } from "./historia/http";
import { dedupeByName, type OsmElement, OsmElementSchema } from "./historia/map-osm";
import {
  type Classified,
  classifyHistoria,
  distanceM,
  mapHistoriaElement,
  nameFromTitle,
  pickPerArticle,
  type WikiArticle,
  wikiTitle,
  wikiTitleFromUrl,
} from "./historia/map-osm-historia";

const HISTORIA_PATH = new URL("../docs/historia/sawa-historia.geojson", import.meta.url);
const OUT_PATH = new URL("../docs/historia/osm-historia.geojson", import.meta.url);
const BBOX = `${CITY_AREA.south},${CITY_AREA.west},${CITY_AREA.north},${CITY_AREA.east}`;
const OVERPASS = "https://overpass-api.de/api/interpreter";
const WIKI_API = "https://pl.wikipedia.org/w/api.php";
const MIN_EXTRACT = 200;
// An article whose coordinates are further away is about something else (a person, an institution).
const MAX_ARTICLE_DISTANCE_M = 1500;

const WIKI = `["wikipedia"~"^pl:"]`;
const QUERY = `[out:json][timeout:120];
(
  nwr${WIKI}["historic"](${BBOX});
  nwr${WIKI}["tourism"~"^(museum|gallery|attraction|artwork)$"](${BBOX});
  nwr${WIKI}["amenity"~"^(place_of_worship|theatre|arts_centre|cinema|library|concert_hall|grave_yard)$"](${BBOX});
  nwr${WIKI}["building"~"^(church|cathedral|chapel)$"](${BBOX});
  nwr${WIKI}["landuse"="cemetery"](${BBOX});
);
out center tags;`;

type Candidate = { el: OsmElement; cls: Classified; title: string };

/** Skips the one-article-at-a-time fetch of short leads, which Wikipedia throttles hard. */
const FAST = process.argv.includes("--fast");

async function main() {
  const elements = await overpass();
  const candidates: Candidate[] = [];
  for (const el of elements) {
    const cls = classifyHistoria(el);
    const title = wikiTitle(el.tags.wikipedia);
    if (cls && title) candidates.push({ el, cls, title });
  }

  const previous = FAST ? await previousFeatures() : [];
  const known = new Set(previous.flatMap((f) => f.properties.zrodla.map((s) => s.url)));
  const articles = await wikiArticles([...new Set(candidates.map((c) => c.title))]);
  console.log(`${articles.size} articles fetched`);
  const curated = await curatedPlaces();
  const drop = { noArticle: 0, short: 0, far: 0, curatedArticle: 0 };
  const withArticle: (Candidate & { wiki: WikiArticle })[] = [];
  for (const c of candidates) {
    const wiki = articles.get(c.title);
    const pos = position(c.el);
    if (!wiki) drop.noArticle++;
    else if (wiki.extract.length < MIN_EXTRACT) drop.short++;
    else if (wiki.coordinates && distanceM(wiki.coordinates, pos) > MAX_ARTICLE_DISTANCE_M)
      drop.far++;
    else if (curated.titles.has(wiki.title) || curated.titles.has(c.title)) drop.curatedArticle++;
    else if (known.has(wiki.url)) continue;
    // Redirects can point several tags at one article, so group by the resolved title.
    else withArticle.push({ ...c, wiki, title: wiki.title });
  }

  const unique = pickPerArticle(withArticle).map((c) => ({
    ...c,
    name: c.el.tags.name ?? nameFromTitle(c.wiki.title),
    ...position(c.el),
  }));
  const kept = dedupeByName([...curated.places, ...previous.map(asNamed), ...unique]).filter(
    (x): x is (typeof unique)[number] => "el" in x,
  );

  const features = [
    ...previous,
    ...kept.map(({ el, cls, wiki }) => mapHistoriaElement(el, cls, wiki)).filter((f) => f !== null),
  ].sort((a, b) => a.properties.id.localeCompare(b.properties.id));

  await writeFile(
    OUT_PATH,
    `${JSON.stringify({ type: "FeatureCollection", features }, null, 1)}\n`,
  );

  const count = (values: string[]) =>
    Object.fromEntries(
      [...new Set(values)].sort().map((v) => [v, values.filter((x) => x === v).length]),
    );
  const outside = features.filter(
    (f) => !inArea(f.geometry.coordinates[1], f.geometry.coordinates[0], AREA),
  ).length;
  console.log(
    `${elements.length} OSM elements → ${candidates.length} candidates → ${features.length} places (${outside} outside the old AREA)`,
  );
  console.log("dropped:", {
    ...drop,
    sameArticle: withArticle.length - unique.length,
    sameName: unique.length - kept.length,
  });
  console.log("typ:", count(features.map((f) => f.properties.typ)));
  console.log("tagi:", count(features.flatMap((f) => f.properties.tagi)));
}

async function overpass(): Promise<OsmElement[]> {
  // A busy server answers 200 with an XML error page, so retry until the body is JSON.
  for (let attempt = 1; ; attempt++) {
    const res = await fetchWithRetry(OVERPASS, {
      method: "POST",
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      body: new URLSearchParams({ data: QUERY }),
    });
    const text = await res.text();
    if (res.ok && text.trimStart().startsWith("{")) {
      return z.object({ elements: z.array(OsmElementSchema) }).parse(JSON.parse(text)).elements;
    }
    if (attempt >= 4) throw new Error(`Overpass ${res.status}: ${text.slice(0, 300)}`);
    console.warn(`overpass ${res.status}, retrying`);
    await sleep(20_000 * attempt);
  }
}

const WikiResponseSchema = z.object({
  continue: z.unknown().optional(),
  query: z
    .object({
      normalized: z.array(z.object({ from: z.string(), to: z.string() })).optional(),
      redirects: z.array(z.object({ from: z.string(), to: z.string() })).optional(),
      pages: z.record(
        z.string(),
        z.object({
          title: z.string(),
          missing: z.unknown().optional(),
          extract: z.string().optional(),
          fullurl: z.string().optional(),
          pageprops: z.record(z.string(), z.unknown()).optional(),
          coordinates: z.array(z.object({ lat: z.number(), lon: z.number() })).optional(),
        }),
      ),
    })
    .optional(),
});

/** Leads for many titles, 20 per request; keyed by the title as OSM gives it. */
async function wikiArticles(titles: string[]): Promise<Map<string, WikiArticle>> {
  const out = new Map<string, WikiArticle>();
  for (let i = 0; i < titles.length; i += 20) {
    const batch = titles.slice(i, i + 20);
    const params = new URLSearchParams({
      action: "query",
      prop: "extracts|info|pageprops|coordinates",
      exintro: "1",
      explaintext: "1",
      exlimit: "20",
      inprop: "url",
      ppprop: "disambiguation",
      colimit: "max",
      redirects: "1",
      format: "json",
      titles: batch.join("|"),
    });
    const body = WikiResponseSchema.parse(await wikiGet(`${WIKI_API}?${params}`));
    if (body.continue) console.warn(`wikipedia batch ${i} incomplete, some leads may be missing`);
    const query = body.query;
    const byTitle = new Map(Object.values(query?.pages ?? {}).map((p) => [p.title, p]));
    const resolve = (pairs: { from: string; to: string }[] | undefined, title: string) =>
      pairs?.find((p) => p.from === title)?.to ?? title;

    for (const title of batch) {
      const page = byTitle.get(resolve(query?.redirects, resolve(query?.normalized, title)));
      if (!page || page.missing !== undefined || !page.extract || !page.fullurl) continue;
      if (page.pageprops && "disambiguation" in page.pageprops) continue;
      const coord = page.coordinates?.[0];
      out.set(title, {
        title: page.title,
        extract: page.extract.trim(),
        url: page.fullurl,
        ...(coord ? { coordinates: { lat: coord.lat, lng: coord.lon } } : {}),
      });
    }
    await sleep(1000);
  }

  if (FAST) return out;
  // Many Polish leads are one line ("Teatr Ateneum – teatr w Warszawie."), so take the
  // first sentences of the whole article instead. TextExtracts gives those one page at a time.
  const short = [...out.entries()].filter(([, a]) => a.extract.length < MIN_EXTRACT);
  console.log(
    `${out.size} articles, ${short.length} with a short lead: fetching their first sentences`,
  );
  for (const [title, article] of short) {
    const params = new URLSearchParams({
      action: "query",
      prop: "extracts",
      explaintext: "1",
      exsentences: "10",
      format: "json",
      titles: article.title,
    });
    const body = WikiResponseSchema.parse(await wikiGet(`${WIKI_API}?${params}`));
    const extract = Object.values(body.query?.pages ?? {})[0]?.extract?.trim();
    if (extract && extract.length > article.extract.length) out.set(title, { ...article, extract });
    await sleep(1000);
  }
  return out;
}

/** TextExtracts rate-limits bursts (429) longer than fetchWithRetry waits, so back off further. */
async function wikiGet(url: string): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetchWithRetry(url, { headers: { "User-Agent": USER_AGENT } });
    if (res.ok) return res.json();
    if (res.status !== 429 || attempt >= 3) throw new Error(`wikipedia ${res.status}: ${url}`);
    console.warn("wikipedia 429, waiting a minute");
    await sleep(60_000);
  }
}

/** Curated places win: OSM never repeats their names nearby or their Wikipedia articles. */
async function curatedPlaces() {
  const collection = JSON.parse(await readFile(HISTORIA_PATH, "utf8")) as {
    features: {
      geometry: { coordinates: [number, number] };
      properties: { nazwa: string; zrodla?: { url: string }[] };
    }[];
  };
  const titles = new Set(
    collection.features
      .flatMap((f) => f.properties.zrodla ?? [])
      .map((s) => wikiTitleFromUrl(s.url))
      .filter((t) => t !== null),
  );
  const places = collection.features.map((f) => ({
    name: f.properties.nazwa,
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }));
  return { titles, places };
}

type PreviousFeature = NonNullable<ReturnType<typeof mapHistoriaElement>>;

/** The committed file, kept as is in --fast mode. */
async function previousFeatures(): Promise<PreviousFeature[]> {
  try {
    return (JSON.parse(await readFile(OUT_PATH, "utf8")) as { features: PreviousFeature[] })
      .features;
  } catch {
    return [];
  }
}

function asNamed(f: PreviousFeature) {
  return {
    name: f.properties.nazwa,
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  };
}

function position(el: OsmElement) {
  return { lat: el.lat ?? el.center?.lat ?? 0, lng: el.lon ?? el.center?.lon ?? 0 };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
