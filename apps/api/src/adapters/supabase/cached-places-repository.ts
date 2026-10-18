// Many demo phones look at the same streets at once; Supabase answers each area once per TTL.

import type { BBox, Place, PlaceSummary } from "../../domain/place";
import type { PlacesRepository } from "../../services/ports";

/** Places change only when the seed runs again. */
const TTL_MS = 5 * 60_000;
/** The asked box is widened to this grid, so nearby map views share one Supabase query. */
const GRID_DEG = 0.02;
/** ~4500 places in the base: every detail fits. */
const MAX_PLACES = 5000;
/** One grid box holds at most every place (~200 kB), so this stays a few MB. */
const MAX_BOXES = 100;
/**
 * Supabase queries in flight at once. 100 at once queued in Supabase's small pool for ~3 s
 * each (23 ms alone) and hit the 5 s timeout; waiting here, the last one is done in ~0.5 s.
 */
const MAX_PARALLEL = 8;

type Entry<T> = { value: Promise<T>; expiresAt: number; isRefreshing: boolean };

/**
 * Promises are kept, so a hundred requests for one key wait on one query. Failures are not
 * kept. A stale value is served at once while one refetch runs; if it fails, the old one stays.
 */
function createTtlCache<T>(maxSize: number, clock: () => number) {
  const entries = new Map<string, Entry<T>>();

  function refresh(key: string, entry: Entry<T>, load: () => Promise<T>) {
    entry.isRefreshing = true;
    load()
      .then((value) => {
        entry.value = Promise.resolve(value);
        entry.expiresAt = clock() + TTL_MS;
      })
      .catch(() => {
        // Supabase is down: keep the old value and ask again in a minute.
        entry.expiresAt = clock() + 60_000;
      })
      .finally(() => {
        entry.isRefreshing = false;
      });
    // Recently used keys go to the end, so eviction drops the least used.
    entries.delete(key);
    entries.set(key, entry);
  }

  return (key: string, load: () => Promise<T>): Promise<T> => {
    const hit = entries.get(key);
    if (hit) {
      if (clock() >= hit.expiresAt && !hit.isRefreshing) refresh(key, hit, load);
      return hit.value;
    }
    const value = load();
    const entry: Entry<T> = { value, expiresAt: Number.POSITIVE_INFINITY, isRefreshing: false };
    value.then(
      () => {
        entry.expiresAt = clock() + TTL_MS;
      },
      () => entries.get(key) === entry && entries.delete(key),
    );
    entries.set(key, entry);
    if (entries.size > maxSize) entries.delete(entries.keys().next().value as string);
    return value;
  };
}

/** Runs at most `max` tasks at once; the others wait in order. */
function createLimiter(max: number) {
  let running = 0;
  const waiting: (() => void)[] = [];
  return async <T>(task: () => Promise<T>): Promise<T> => {
    // A finished task hands its slot straight to the next waiting one.
    if (running >= max) await new Promise<void>((resolve) => waiting.push(resolve));
    else running += 1;
    try {
      return await task();
    } finally {
      const next = waiting.shift();
      if (next) next();
      else running -= 1;
    }
  };
}

function snapOut(bbox: BBox): BBox {
  const down = (v: number) => Math.floor(v / GRID_DEG) * GRID_DEG;
  const up = (v: number) => Math.ceil(v / GRID_DEG) * GRID_DEG;
  return {
    minLng: down(bbox.minLng),
    minLat: down(bbox.minLat),
    maxLng: up(bbox.maxLng),
    maxLat: up(bbox.maxLat),
  };
}

export function createCachedPlacesRepository(
  repo: PlacesRepository,
  clock: () => number = Date.now,
): PlacesRepository {
  const boxes = createTtlCache<PlaceSummary[]>(MAX_BOXES, clock);
  const places = createTtlCache<Place | null>(MAX_PLACES, clock);
  const limit = createLimiter(MAX_PARALLEL);

  return {
    async listInBBox(bbox, interests) {
      // The wider box is fetched without filters; the asked box and interests are cut here.
      // places_in_bbox has no limit, so the result equals the direct query, richest first.
      const grid = snapOut(bbox);
      const key = `${grid.minLng},${grid.minLat},${grid.maxLng},${grid.maxLat}`;
      const all = await boxes(key, () => limit(() => repo.listInBBox(grid)));
      return all.filter(
        ({ position: { lat, lng }, interests: tags }) =>
          lng >= bbox.minLng &&
          lng <= bbox.maxLng &&
          lat >= bbox.minLat &&
          lat <= bbox.maxLat &&
          (!interests?.length || tags.some((t) => interests.includes(t))),
      );
    },

    getById(id) {
      return places(id, () => limit(() => repo.getById(id)));
    },

    // Not used by any route yet; every line is different, so caching would not help.
    listNearLine(line, radiusM, interests) {
      return repo.listNearLine(line, radiusM, interests);
    },
  };
}
