// Shared by the fetch:* scripts that download extra places (OSM, Wikipedia, dane.um.warszawa.pl).

export const USER_AGENT = "sawa-hackathon/1.0 (Warsaw Open Data Hackathon 2026)";

/** Curated places sit in 20.96–21.00, 52.227–52.245; routes run up to ~3 km further. */
export const AREA = { south: 52.21, west: 20.93, north: 52.26, east: 21.02 };

/**
 * Where rides from 42 Warsaw reach in 60–120 min (T-73): Śródmieście, Żoliborz, Ochota,
 * Mokotów and Praga. Too few places outside AREA left the second half of a ride silent.
 */
export const WIDE_AREA = { south: 52.17, west: 20.9, north: 52.3, east: 21.08 };

/** Warsaw's city limits: the map covers the whole city, sparser outside WIDE_AREA. */
export const CITY_AREA = { south: 52.09, west: 20.85, north: 52.37, east: 21.28 };

type Area = typeof AREA;

export const inArea = (lat: number, lng: number, area: Area = AREA) =>
  lat >= area.south && lat <= area.north && lng >= area.west && lng <= area.east;

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
