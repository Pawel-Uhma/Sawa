import { haversineM, type LatLng, toLngLat } from "@sawa/shared";
import { z } from "zod";
import type { WalkPathSource } from "../../services/ports";

const TIMEOUT_MS = 3_000;
const CACHE_SIZE = 200;
/** OSRM snaps points to the nearest path; farther than this the real point is added to the line. */
const SNAP_GAP_M = 2;
/** FOSSGIS answers 429 to more than ~8 requests at once; the planner compares walks in parallel. */
const MAX_IN_FLIGHT = 2;

type LngLat = [number, number];

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

/** The path of an OSRM `route` response, joined to the requested ends; exported for tests. */
export function parseWalkPath(body: unknown, from: LatLng, to: LatLng): LngLat[] | undefined {
  const parsed = ResponseSchema.safeParse(body);
  if (!parsed.success) return undefined;
  const line = parsed.data.routes[0]?.geometry.coordinates as LngLat[];
  const [first, last] = [line[0] as LngLat, line[line.length - 1] as LngLat];
  const gap = (a: LatLng, [lng, lat]: LngLat) => haversineM(a, { lat, lng }) > SNAP_GAP_M;
  return [
    ...(gap(from, first) ? [toLngLat(from)] : []),
    ...line,
    ...(gap(to, last) ? [toLngLat(to)] : []),
  ];
}

/**
 * Walking paths from an OSRM server (`/route/v1/…` with the foot profile). One request per
 * walk, through all its points. Any failure → undefined, so the caller keeps straight lines.
 */
export function createOsrmWalkPathSource(baseUrl: string): WalkPathSource {
  const cache = new Map<string, Promise<LngLat[] | undefined>>();
  let inFlight = 0;
  const waiting: (() => void)[] = [];

  /** Runs `request` when fewer than `MAX_IN_FLIGHT` are running; a finished one hands its slot on. */
  async function limited<T>(request: () => Promise<T>): Promise<T> {
    if (inFlight < MAX_IN_FLIGHT) inFlight++;
    else await new Promise<void>((resolve) => waiting.push(resolve));
    try {
      return await request();
    } finally {
      const next = waiting.shift();
      if (next) next();
      else inFlight--;
    }
  }

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
      const path = limited(() =>
        fetch(url, {
          headers: { "User-Agent": "sawa-api (Warsaw Open Data Hackathon)" },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        }).then(async (res) => (res.ok ? parseWalkPath(await res.json(), first, last) : undefined)),
      ).catch(() => undefined);
      // Failures are not cached, so the next plan asks again.
      path.then((p) => p || cache.delete(coords));
      cache.set(coords, path);
      if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value as string);
      return path;
    },
  };
}
