import type { Destination } from "@sawa/shared";
import { AppError } from "../lib/errors";
import type { DestinationSearch } from "./ports";

/** Each search costs; people retype the same few names, so answers are kept in memory. */
const MAX_CACHED_QUERIES = 500;

export type DestinationService = {
  search(query: string): Promise<Destination[]>;
};

export function createDestinationService(source: DestinationSearch): DestinationService {
  const cache = new Map<string, Promise<Destination[]>>();

  return {
    search(query) {
      const key = query.trim().toLocaleLowerCase("pl").replace(/\s+/g, " ");
      const hit = cache.get(key);
      if (hit) {
        // Re-insert so the Map's insertion order works as least-recently-used.
        cache.delete(key);
        cache.set(key, hit);
        return hit;
      }
      const pending = source.search(key);
      cache.set(key, pending);
      pending.catch(() => cache.delete(key));
      if (cache.size > MAX_CACHED_QUERIES) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      return pending;
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
