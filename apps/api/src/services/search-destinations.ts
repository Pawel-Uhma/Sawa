import type { Destination } from "@sawa/shared";
import { AppError } from "../lib/errors";
import type { DestinationSearch } from "./ports";

/** Each search costs; people retype the same few names, so answers are kept in memory. */
const MAX_CACHED_QUERIES = 500;
/** Like lines and departures (R1 cache rules): new places and fixes show up within the hour. */
export const DESTINATION_CACHE_TTL_MS = 60 * 60 * 1000;

export type DestinationService = {
  search(query: string): Promise<Destination[]>;
};

type Entry = { pending: Promise<Destination[]>; expiresAt: number };

export function createDestinationService(
  source: DestinationSearch,
  opts: { now?: () => number } = {},
): DestinationService {
  const now = opts.now ?? Date.now;
  const cache = new Map<string, Entry>();
  const forget = (key: string, entry: Entry) => {
    if (cache.get(key) === entry) cache.delete(key);
  };

  return {
    search(query) {
      const key = query.trim().toLocaleLowerCase("pl").replace(/\s+/g, " ");
      const hit = cache.get(key);
      if (hit && hit.expiresAt > now()) {
        // Re-insert so the Map's insertion order works as least-recently-used.
        cache.delete(key);
        cache.set(key, hit);
        return hit.pending;
      }
      cache.delete(key);
      const entry: Entry = {
        pending: source.search(key).then(({ results, partial }) => {
          // A partial answer (no street) would hide the street until the entry expires.
          if (partial) forget(key, entry);
          return results;
        }),
        expiresAt: now() + DESTINATION_CACHE_TTL_MS,
      };
      cache.set(key, entry);
      entry.pending.catch(() => forget(key, entry));
      if (cache.size > MAX_CACHED_QUERIES) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      return entry.pending;
    },
  };
}

/** Used when GOOGLE_PLACES_API_KEY is missing, so the rest of the API still runs. */
export function createDisabledDestinationService(): DestinationService {
  return {
    search: async () => {
      throw new AppError(
        "UPSTREAM_ERROR",
        "Place search is not configured (GOOGLE_PLACES_API_KEY)",
      );
    },
  };
}
