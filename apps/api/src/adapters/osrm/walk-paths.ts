import { haversineM, type LatLng, toLngLat } from "@sawa/shared";
import { z } from "zod";
import type { WalkPathSource } from "../../services/ports";

const TIMEOUT_MS = 3_000;
const CACHE_SIZE = 200;
/** OSRM snaps points to the nearest path; farther than this the real point is added to the line. */
const SNAP_GAP_M = 2;

type LngLat = [number, number];

export type WalkRouterLogger = { warn(obj: object, msg: string): void };

const ResponseSchema = z.object({
  code: z.literal("Ok"),
  routes: z
    .array(
      z.object({
        geometry: z.object({
          coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
        }),
      }),
    )
    .min(1),
});

/** A router's line (snapped to paths) joined to the requested ends when they are off it. */
export function joinToEnds(line: LngLat[], from: LatLng, to: LatLng): LngLat[] {
  const [first, last] = [line[0] as LngLat, line[line.length - 1] as LngLat];
  const gap = (a: LatLng, [lng, lat]: LngLat) => haversineM(a, { lat, lng }) > SNAP_GAP_M;
  return [
    ...(gap(from, first) ? [toLngLat(from)] : []),
    ...line,
    ...(gap(to, last) ? [toLngLat(to)] : []),
  ];
}

/** The path of an OSRM `route` response, joined to the requested ends; exported for tests. */
export function parseWalkPath(body: unknown, from: LatLng, to: LatLng): LngLat[] | undefined {
  const parsed = ResponseSchema.safeParse(body);
  if (!parsed.success) return undefined;
  return joinToEnds(parsed.data.routes[0]?.geometry.coordinates as LngLat[], from, to);
}

/**
 * Walking paths from an OSRM server (`/route/v1/…` with the foot profile). One request per
 * walk, through all its points. Any failure → undefined (logged), so the caller tries another
 * router or keeps straight lines.
 */
export function createOsrmWalkPathSource(
  baseUrl: string,
  logger?: WalkRouterLogger,
): WalkPathSource {
  const cache = new Map<string, Promise<LngLat[] | undefined>>();

  return {
    path(points) {
      const first = points[0];
      const last = points[points.length - 1];
      if (!first || !last || points.length < 2) return Promise.resolve(undefined);
      const coords = points.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(";");
      const hit = cache.get(coords);
      if (hit) return hit;

      // FOSSGIS serves each profile under its own path; "driving" is just the API's name.
      const url = `${baseUrl}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
      const path = fetch(url, {
        headers: { "User-Agent": "sawa-api (Warsaw Open Data Hackathon)" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
        .then(async (res) => {
          if (res.ok) return parseWalkPath(await res.json(), first, last);
          logger?.warn({ router: "osrm", status: res.status }, "walk path request failed");
          return undefined;
        })
        .catch((err) => {
          logger?.warn({ router: "osrm", err: String(err) }, "walk path request failed");
          return undefined;
        });
      // Failures are not cached, so the next plan asks again.
      path.then((p) => p || cache.delete(coords));
      cache.set(coords, path);
      if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value as string);
      return path;
    },
  };
}

/** A router that failed is skipped this long, so plans do not wait for it to fail again. */
const FAILED_SKIP_MS = 60_000;

/**
 * The first path any of `sources` finds, asked in order: the public routers block an IP that
 * asks too often (shared cloud IPs too), so a second one keeps walks off straight lines. A
 * source that failed is skipped for `FAILED_SKIP_MS` (asked anyway when all are skipped).
 */
export function firstWalkPath(
  sources: WalkPathSource[],
  clock: () => number = Date.now,
): WalkPathSource {
  const failedAt = sources.map(() => Number.NEGATIVE_INFINITY);
  return {
    async path(points) {
      const now = clock();
      const fresh = sources.filter((_, i) => now - (failedAt[i] as number) >= FAILED_SKIP_MS);
      for (const source of fresh.length > 0 ? fresh : sources) {
        const path = await source.path(points);
        if (path) return path;
        failedAt[sources.indexOf(source)] = clock();
      }
      return undefined;
    },
  };
}
