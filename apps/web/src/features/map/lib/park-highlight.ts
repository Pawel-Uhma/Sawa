import type { ExpressionSpecification } from "maplibre-gl";
import type { LngLat } from "./bounds";

/** Basemap layers that carry park areas (OpenMapTiles schema). Parks sit in landcover. */
export const PARK_AREA_SOURCE_LAYERS = ["landcover", "landuse", "park"] as const;
/** Named points of parks; a park's point and its area share the feature id. */
export const PARK_NAME_SOURCE_LAYERS = ["poi", "park"] as const;

/** A named park further than this from our point is another park with the same name. */
const MAX_DISTANCE_M = 1500;

type ParkLike = { kind?: string; subkind?: string | null };

/** Parks, squares and gardens are points in our data; the area comes from the basemap. */
export function isParkPlace(place: ParkLike): boolean {
  return place.subkind === "park" || place.subkind === "garden";
}

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[„”“"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Names the park may have in OSM. Most of ours come from OSM as they are; a note in parentheses
 * ("Park Młociński (Las Młociny)") is often the OSM name, so it is a key too.
 */
export function parkNameKeys(name: string): string[] {
  const note = name.match(/\(([^)]*)\)\s*$/)?.[1];
  const keys = [name.replace(/\s*\(.*\)\s*$/, "")];
  if (note) keys.push(note);
  return [...new Set(keys.map(normalize).filter(Boolean))];
}

type NamedFeature = {
  id?: string | number;
  properties: Record<string, unknown> | null;
  geometry: { type: string; coordinates?: unknown };
};

/** First coordinate pair of any geometry: the point itself or a corner of the area. */
function firstPoint(geometry: NamedFeature["geometry"]): LngLat | null {
  let coordinates = geometry.coordinates;
  while (Array.isArray(coordinates) && Array.isArray(coordinates[0])) coordinates = coordinates[0];
  return Array.isArray(coordinates) && typeof coordinates[0] === "number"
    ? (coordinates as LngLat)
    : null;
}

function distanceM([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const x = (lng2 - lng1) * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  return Math.hypot(x, lat2 - lat1) * 111_320;
}

/** Id of the basemap park named like ours, nearest to our point; null when none is close. */
export function findParkFeatureId(
  features: readonly NamedFeature[],
  name: string,
  at: LngLat,
): number | null {
  const keys = parkNameKeys(name);
  let best: { id: number; distance: number } | null = null;
  for (const feature of features) {
    const featureName = feature.properties?.name;
    if (typeof feature.id !== "number" || typeof featureName !== "string") continue;
    if (!keys.includes(normalize(featureName))) continue;
    const point = firstPoint(feature.geometry);
    const distance = point ? distanceM(point, at) : Number.POSITIVE_INFINITY;
    if (distance > MAX_DISTANCE_M) continue;
    if (!best || distance < best.distance) best = { id: feature.id, distance };
  }
  return best?.id ?? null;
}

/** Filter for the basemap area with this feature id; matches nothing for null. */
export function parkAreaFilter(id: number | null): ExpressionSpecification {
  return ["==", ["id"], id ?? -1];
}
