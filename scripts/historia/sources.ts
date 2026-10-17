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
  // Wola, Bemowo, Bielany, Żoliborz, Śródmieście: facts from the local Wikipedia dump and OSM tags
  // (docs/historia/dzielnice/README.md), deduplicated against the files above.
  new URL("../../docs/historia/dzielnice/sawa-dzielnice.geojson", import.meta.url),
  new URL("../../docs/historia/dzielnice/osm-dzielnice.geojson", import.meta.url),
  // Same districts: warszawa1939.pl cards (CC BY-NC, Firecrawl) and Warszawikia (CC BY-SA).
  new URL("../../docs/historia/dzielnice/warszawa1939-dzielnice.geojson", import.meta.url),
  new URL("../../docs/historia/dzielnice/warszawikia-dzielnice.geojson", import.meta.url),
  // Address sentences from Wikipedia biographies ("lived here") and Virtual Shtetl (POLIN) objects.
  new URL("../../docs/historia/dzielnice/wikipedia-adresy-dzielnice.geojson", import.meta.url),
  new URL("../../docs/historia/dzielnice/sztetl-dzielnice.geojson", import.meta.url),
  // Pozostałe 13 dzielnic: Wikipedia (ZIM + Wikidata), Warszawikia, Wirtualny Sztetl.
  new URL("../../docs/historia/dzielnice/wikipedia-pozostale-dzielnice.geojson", import.meta.url),
  new URL("../../docs/historia/dzielnice/warszawikia-pozostale-dzielnice.geojson", import.meta.url),
  new URL("../../docs/historia/dzielnice/sztetl-pozostale-dzielnice.geojson", import.meta.url),
  new URL("../../docs/historia/dzielnice/osm-pozostale-dzielnice.geojson", import.meta.url),
];

export async function readSourceFeatures(): Promise<unknown[]> {
  const features: unknown[] = [];
  for (const file of SOURCE_FILES) {
    const collection = JSON.parse(await readFile(file, "utf8")) as { features: unknown[] };
    features.push(...collection.features);
  }
  return features;
}
