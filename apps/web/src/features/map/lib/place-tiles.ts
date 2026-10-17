import type { PlaceSummaryFeature } from "@sawa/shared";
import type { LngLatBounds } from "./bounds";

/**
 * Places are fetched per fixed grid tile, not per exact view: panning reuses tiles already
 * in the query cache and only the new ones are requested. ~2.7 × 2.8 km in Warsaw.
 */
export const PLACE_TILE_DEG = { lng: 0.04, lat: 0.025 };

/** Below this zoom the map asks once for the whole city (CITY_BBOX) instead of per tile. */
export const MIN_PLACES_ZOOM = 13;

/**
 * Warsaw with a margin, `minLng,minLat,maxLng,maxLat`. ~3000 places, ~110 kB gzip: one cached
 * request is cheaper than the dozens of tiles a zoomed-out view would touch.
 */
export const CITY_BBOX = "20.85,52.09,21.28,52.37";

/** Cap for very wide screens; the tiles nearest the centre win. */
export const MAX_PLACE_TILES = 36;

export type PlaceTile = { x: number; y: number };

/** Grid tiles covering the view, nearest the centre first; none below MIN_PLACES_ZOOM. */
export function tilesInView(bounds: LngLatBounds, zoom: number): PlaceTile[] {
  if (zoom < MIN_PLACES_ZOOM) return [];
  const [[west, south], [east, north]] = bounds;
  const minX = Math.floor(west / PLACE_TILE_DEG.lng);
  const maxX = Math.floor(east / PLACE_TILE_DEG.lng);
  const minY = Math.floor(south / PLACE_TILE_DEG.lat);
  const maxY = Math.floor(north / PLACE_TILE_DEG.lat);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const tiles: PlaceTile[] = [];
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) tiles.push({ x, y });
  }
  const distance = (t: PlaceTile) => (t.x - centerX) ** 2 + (t.y - centerY) ** 2;
  return tiles.sort((a, b) => distance(a) - distance(b)).slice(0, MAX_PLACE_TILES);
}

/** Bboxes to ask `GET /v1/places` for: the whole city when zoomed out, else the tiles in view. */
export function placeBBoxesInView(bounds: LngLatBounds, zoom: number): string[] {
  if (zoom < MIN_PLACES_ZOOM) return [CITY_BBOX];
  return tilesInView(bounds, zoom).map(tileBBoxParam);
}

/** `minLng,minLat,maxLng,maxLat` for `GET /v1/places?bbox=`. */
export function tileBBoxParam({ x, y }: PlaceTile): string {
  // Rounded, because 0.04 * x in floating point gives 20.880000000000003.
  const round = (n: number) => Number(n.toFixed(6));
  return [
    round(x * PLACE_TILE_DEG.lng),
    round(y * PLACE_TILE_DEG.lat),
    round((x + 1) * PLACE_TILE_DEG.lng),
    round((y + 1) * PLACE_TILE_DEG.lat),
  ].join(",");
}

/** One list from many tiles; a place on a shared tile edge comes back from both. */
export function mergeTilePlaces(
  tiles: readonly (readonly PlaceSummaryFeature[] | undefined)[],
): PlaceSummaryFeature[] {
  const byId = new Map<string, PlaceSummaryFeature>();
  for (const places of tiles) {
    for (const place of places ?? []) byId.set(place.properties.id, place);
  }
  return [...byId.values()];
}
