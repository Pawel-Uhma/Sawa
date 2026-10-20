import type { LatLng } from "@sawa/shared";
import { z } from "zod";
import type { WalkPathSource } from "../../services/ports";
import { joinToEnds, type WalkRouterLogger } from "../osrm/walk-paths";

const TIMEOUT_MS = 3_000;
const CACHE_SIZE = 200;

type LngLat = [number, number];

const ResponseSchema = z.object({
  trip: z.object({
    status: z.literal(0),
    legs: z.array(z.object({ shape: z.string() })).min(1),
  }),
});

/** Google's encoded polyline at 6 digits (Valhalla's `shape`) → [lng, lat] pairs. */
export function decodePolyline6(encoded: string): LngLat[] {
  const out: LngLat[] = [];
  let [i, lat, lng] = [0, 0, 0];
  const next = () => {
    let [shift, result, byte] = [0, 0, 0x20];
    while (byte >= 0x20 && i < encoded.length) {
      byte = encoded.charCodeAt(i++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    }
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (i < encoded.length) {
    lat += next();
    lng += next();
    out.push([lng / 1e6, lat / 1e6]);
  }
  return out;
}

/** The path of a Valhalla `route` response (its legs joined), to the requested ends; exported for tests. */
export function parseValhallaPath(body: unknown, from: LatLng, to: LatLng): LngLat[] | undefined {
  const parsed = ResponseSchema.safeParse(body);
  if (!parsed.success) return undefined;
  // Each leg starts where the previous one ended.
  const line = parsed.data.trip.legs.flatMap((leg, i) =>
    decodePolyline6(leg.shape).slice(i === 0 ? 0 : 1),
  );
  return line.length >= 2 ? joinToEnds(line, from, to) : undefined;
}

/**
 * Walking paths from a Valhalla server (`/route`, pedestrian costing): the fallback when the
 * OSRM one fails. One request per walk, through all its points. Any failure → undefined.
 */
export function createValhallaWalkPathSource(
  baseUrl: string,
  logger?: WalkRouterLogger,
  /** "bicycle" and "auto" draw bike and car legs the same way (#190, #191). */
  { costing = "pedestrian" }: { costing?: "pedestrian" | "bicycle" | "auto" } = {},
): WalkPathSource {
  const cache = new Map<string, Promise<LngLat[] | undefined>>();

  return {
    path(points) {
      const first = points[0];
      const last = points[points.length - 1];
      if (!first || !last || points.length < 2) return Promise.resolve(undefined);
      const locations = points.map((p) => ({ lat: +p.lat.toFixed(6), lon: +p.lng.toFixed(6) }));
      const key = JSON.stringify(locations);
      const hit = cache.get(key);
      if (hit) return hit;

      const path = fetch(`${baseUrl}/route`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "sawa-api (Warsaw Open Data Hackathon)",
        },
        body: JSON.stringify({ locations, costing, directions_type: "none" }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
        .then(async (res) => {
          if (res.ok) return parseValhallaPath(await res.json(), first, last);
          logger?.warn({ router: "valhalla", status: res.status }, "walk path request failed");
          return undefined;
        })
        .catch((err) => {
          logger?.warn({ router: "valhalla", err: String(err) }, "walk path request failed");
          return undefined;
        });
      // Failures are not cached, so the next plan asks again.
      path.then((p) => p || cache.delete(key));
      cache.set(key, path);
      if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value as string);
      return path;
    },
  };
}
