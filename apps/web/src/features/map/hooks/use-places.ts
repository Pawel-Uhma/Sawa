import { PlacesResponseSchema } from "@sawa/shared";
import { useQuery } from "@tanstack/react-query";
import { API_TIMEOUT_MS, api } from "@/lib/api";
import { PLACES_BBOX } from "../lib/map-style";

const BBOX_PARAM = [
  PLACES_BBOX.minLng,
  PLACES_BBOX.minLat,
  PLACES_BBOX.maxLng,
  PLACES_BBOX.maxLat,
].join(",");

/** All places of the data area at once; interests are filtered in the browser (14-plan-mapy §6). */
export function usePlaces() {
  return useQuery({
    queryKey: ["places", BBOX_PARAM],
    queryFn: async () => {
      const res = await api.v1.places.$get(
        { query: { bbox: BBOX_PARAM } },
        { init: { signal: AbortSignal.timeout(API_TIMEOUT_MS) } },
      );
      if (!res.ok) throw new Error(`GET /v1/places: ${res.status}`);
      return PlacesResponseSchema.parse(await res.json()).features;
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
}
