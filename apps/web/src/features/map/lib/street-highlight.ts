import type { ExpressionSpecification } from "maplibre-gl";

/** Basemap source and layer with named street lines (OpenMapTiles schema, both OpenFreeMap styles). */
export const STREET_LINES_SOURCE = "openmaptiles";
export const STREET_LINES_SOURCE_LAYER = "transportation_name";

type StreetLike = { name?: string; kind?: string; subkind?: string | null };

/** Streets are points in our data (at one end of the street); the line comes from the basemap. */
export function isStreetPlace(place: StreetLike): boolean {
  return place.kind === "street" || place.subkind === "street";
}

const PREFIX = /^(ul\.|ulica|al\.|aleja)\s+/i;

/**
 * Lower-case names the street may have in OSM. Our names come in many shapes ("Ulica Kacza",
 * "ul. Działdowska", "Aleja „Solidarności”"), OSM drops "ulica" but keeps "aleja".
 */
export function streetNameKeys(name: string): string[] {
  const clean = name.replace(/\s*\(.*\)\s*$/, "").trim();
  const bare = clean.replace(PREFIX, "");
  const keys = [clean, bare];
  if (/^(al\.|aleja)\s/i.test(clean)) keys.push(`aleja ${bare}`);
  return [...new Set(keys.map((key) => key.toLowerCase()))];
}

/** Filter for basemap street lines with this name; matches nothing for null. */
export function streetLineFilter(name: string | null): ExpressionSpecification {
  return [
    "in",
    ["downcase", ["coalesce", ["get", "name"], ""]],
    ["literal", name ? streetNameKeys(name) : []],
  ];
}
