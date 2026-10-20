import { BikeStationsResponseSchema } from "@sawa/shared";
import { useQuery } from "@tanstack/react-query";
import { API_TIMEOUT_MS, api } from "@/lib/api";

/** Veturilo stations with live bikes and docks, asked for again every minute (#192). */
export function useBikeStations(enabled: boolean) {
  return useQuery({
    queryKey: ["bike-stations"],
    enabled,
    queryFn: async () => {
      const res = await api.v1["bike-stations"].$get(undefined, {
        init: { signal: AbortSignal.timeout(API_TIMEOUT_MS) },
      });
      if (!res.ok) throw new Error(`GET /v1/bike-stations: ${res.status}`);
      return BikeStationsResponseSchema.parse(await res.json());
    },
    refetchInterval: 60_000,
    // Stations stay on the map while the next answer is on its way.
    placeholderData: (prev) => prev,
  });
}
