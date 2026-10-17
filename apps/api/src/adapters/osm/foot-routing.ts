import type { LatLng } from "@sawa/shared";
import type { WalkPathSource } from "../../services/ports";

/** FOSSGIS public OSRM with the foot profile (OpenStreetMap data, ODbL). Light use only. */
const ENDPOINT = "https://routing.openstreetmap.de/routed-foot/route/v1/driving";
const TIMEOUT_MS = 2_000;
const CACHE_SIZE = 500;

export const FOOT_ROUTING_ATTRIBUTION =
  "Trasy piesze: © współtwórcy OpenStreetMap (ODbL), routing.openstreetmap.de (FOSSGIS)";

/** The street path from an OSRM `route` answer, or undefined when it has none. */
export function parseFootRoute(body: unknown): LatLng[] | undefined {
  const route = (body as { routes?: { geometry?: { coordinates?: unknown } }[] })?.routes?.[0];
  const coords = route?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return undefined;
  const path = coords.flatMap((c) =>
    Array.isArray(c) && typeof c[0] === "number" && typeof c[1] === "number"
      ? [{ lat: c[1], lng: c[0] }]
      : [],
  );
  return path.length >= 2 ? path : undefined;
}

/** Street paths on foot; undefined on timeout, error or no route (the caller keeps a line). */
export function createFootRoutingSource(fetchImpl: typeof fetch = fetch): WalkPathSource {
  const cache = new Map<string, Promise<LatLng[] | undefined>>();
  const key = (p: LatLng) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`;

  return {
    path(from, to) {
      const k = `${key(from)};${key(to)}`;
      let hit = cache.get(k);
      if (!hit) {
        hit = fetchImpl(`${ENDPOINT}/${k}?overview=full&geometries=geojson`, {
          headers: { "User-Agent": "Sawa (Warsaw Open Data Hackathon 2026)" },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        })
          .then(async (res) => (res.ok ? parseFootRoute(await res.json()) : undefined))
          .catch(() => undefined);
        // Failures are not cached, so the next request tries again.
        void hit.then((path) => path ?? cache.delete(k));
        cache.set(k, hit);
        if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value as string);
      }
      return hit;
    },
  };
}
