import { type Place, PlaceSchema } from "@sawa/shared";
import { useQuery } from "@tanstack/react-query";
import { API_TIMEOUT_MS, api } from "@/lib/api";

/** Full place for the card: facts, photos, sources. Null when the API does not know the id. */
export function usePlace(id: string | null) {
  return useQuery({
    queryKey: ["place", id],
    enabled: id !== null,
    queryFn: async (): Promise<Place | null> => {
      const res = await api.v1.places[":id"].$get(
        { param: { id: id ?? "" } },
        { init: { signal: AbortSignal.timeout(API_TIMEOUT_MS) } },
      );
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`GET /v1/places/${id}: ${res.status}`);
      return PlaceSchema.parse(await res.json());
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
}
