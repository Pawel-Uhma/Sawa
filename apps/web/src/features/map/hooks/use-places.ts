import { type PlaceSummaryFeature, PlacesResponseSchema } from "@sawa/shared";
import { type UseQueryResult, useQueries } from "@tanstack/react-query";
import { useMemo, useRef } from "react";
import { API_TIMEOUT_MS, api } from "@/lib/api";
import { mergeTilePlaces } from "../lib/place-tiles";

/** Tiles left behind by panning stay cached a while, so panning back costs no request. */
const TILE_GC_TIME_MS = 30 * 60 * 1000;

export type PlacesInView = {
  data: PlaceSummaryFeature[];
  isError: boolean;
  refetch: () => void;
};

/**
 * Places of the bboxes in view (`placeBBoxesInView`); interests are filtered in the browser
 * (14-plan-mapy §6). While new bboxes load, the places shown before stay, so zooming between
 * tiles and the whole city does not blink the dots away.
 */
export function usePlaces(bboxes: readonly string[]): PlacesInView {
  const result = useQueries({
    queries: bboxes.map((bbox) => ({
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
    })),
    combine: combineTiles,
  });
  const { isPending, data: current, isError, refetch } = result;
  const settled = useRef(current);
  if (!isPending) settled.current = current;
  const previous = settled.current;
  const data = useMemo(
    () => (isPending ? mergeTilePlaces([previous, current]) : current),
    [isPending, previous, current],
  );
  return { data, isError, refetch };
}

// Module-level, so TanStack Query keeps the combined result stable between renders.
function combineTiles(results: UseQueryResult<PlaceSummaryFeature[]>[]) {
  return {
    data: mergeTilePlaces(results.map((r) => r.data)),
    isError: results.some((r) => r.isError),
    isPending: results.some((r) => r.isPending),
    refetch: () => {
      for (const r of results) if (r.isError) r.refetch();
    },
  };
}
