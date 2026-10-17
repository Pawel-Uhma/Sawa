// Shared by the fetch:* scripts that download extra places (OSM, Wikipedia, dane.um.warszawa.pl).

export const USER_AGENT = "sawa-hackathon/1.0 (Warsaw Open Data Hackathon 2026)";

/** Curated places sit in 20.96–21.00, 52.227–52.245; routes run up to ~3 km further. */
export const AREA = { south: 52.21, west: 20.93, north: 52.26, east: 21.02 };

export const inArea = (lat: number, lng: number) =>
  lat >= AREA.south && lat <= AREA.north && lng >= AREA.west && lng <= AREA.east;

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Overpass, Nominatim and the Wikipedia REST API rate-limit bursts (429) and time out (504). */
export async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let res = await fetch(url, init);
  for (let attempt = 1; [429, 504].includes(res.status) && attempt <= 4; attempt++) {
    await sleep(5000 * attempt);
    res = await fetch(url, init);
  }
  return res;
}
