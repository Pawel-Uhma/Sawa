import { type Destination, DestinationsResponseSchema } from "@sawa/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { API_TIMEOUT_MS, api } from "@/lib/api";

/** Tyle czekamy po ostatnim znaku, zanim zapytamy Google (każde zapytanie kosztuje). */
const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

/** Cele z Google Places dla wpisanego tekstu (`GET /v1/destinations`), z opóźnieniem po pisaniu. */
export function useDestinationSearch(text: string) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const enabled = query.length >= MIN_CHARS;
  const result = useQuery({
    queryKey: ["destinations", query.toLocaleLowerCase("pl")],
    enabled,
    queryFn: async ({ signal }): Promise<Destination[]> => {
      const res = await api.v1.destinations.$get(
        { query: { q: query } },
        { init: { signal: AbortSignal.any([signal, AbortSignal.timeout(API_TIMEOUT_MS)]) } },
      );
      if (!res.ok) throw new Error(`GET /v1/destinations: ${res.status}`);
      return DestinationsResponseSchema.parse(await res.json()).results;
    },
    staleTime: Number.POSITIVE_INFINITY,
    placeholderData: keepPreviousData,
    retry: false,
  });

  return {
    results: enabled ? (result.data ?? []) : [],
    isSearching: text.trim() !== query || (enabled && result.isFetching),
    isError: enabled && result.isError,
    hasQuery: text.trim().length >= MIN_CHARS,
  };
}
