import { type PlaceSummaryFeature, PlacesResponseSchema } from "@sawa/shared";
import { type UseQueryResult, useQueries } from "@tanstack/react-query";
import { API_TIMEOUT_MS, api } from "@/lib/api";
import { mergeTilePlaces, type PlaceTile, tileBBoxParam } from "../lib/place-tiles";

/** Tiles left behind by panning stay cached a while, so panning back costs no request. */
const TILE_GC_TIME_MS = 30 * 60 * 1000;

export type PlacesInView = {
  data: PlaceSummaryFeature[];
  isError: boolean;
  refetch: () => void;
};

/** Places of the tiles in view; interests are filtered in the browser (14-plan-mapy §6). */
export function usePlaces(tiles: readonly PlaceTile[]): PlacesInView {
  return useQueries({
    queries: tiles.map((tile) => {
      const bbox = tileBBoxParam(tile);
      return {
        queryKey: ["places", bbox],
        queryFn: async () => {
          const res = await api.v1.places.$get(
            { query: { bbox } },
            { init: { signal: AbortSignal.timeout(API_TIMEOUT_MS) } },
          );
          if (!res.ok) throw new Error(`GET /v1/places: ${res.status}`);
          return PlacesResponseSchema.parse(await res.json()).features;
        },
        staleTime: Number.POSITIVE_INFINITY,
        gcTime: TILE_GC_TIME_MS,
      };
    }),
    combine: combineTiles,
  });
}

// Module-level, so TanStack Query keeps the combined result stable between renders.
function combineTiles(results: UseQueryResult<PlaceSummaryFeature[]>[]): PlacesInView {
  return {
    data: mergeTilePlaces(results.map((r) => r.data)),
    isError: results.some((r) => r.isError),
    refetch: () => {
      for (const r of results) if (r.isError) r.refetch();
    },
  };
}
