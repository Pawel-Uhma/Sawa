import {
  type Route,
  type TrackVehiclesRequest,
  TrackVehiclesResponseSchema,
  trackRequestFromRoute,
} from "@sawa/shared";
import { useQuery } from "@tanstack/react-query";
import { API_TIMEOUT_MS, api } from "@/lib/api";

/** Vehicles of the route's tram and bus legs, asked for again every 10 s (ZTM refresh rate). */
export function useLiveVehicles(route: Route | undefined) {
  const body = route ? trackRequestFromRoute(route) : undefined;
  return useQuery({
    queryKey: ["vehicles", route?.id],
    enabled: Boolean(body),
    queryFn: async () => {
      const res = await api.v1.vehicles.track.$post(
        { json: body as TrackVehiclesRequest },
        { init: { signal: AbortSignal.timeout(API_TIMEOUT_MS) } },
      );
      if (!res.ok) throw new Error(`POST /v1/vehicles/track: ${res.status}`);
      return TrackVehiclesResponseSchema.parse(await res.json());
    },
    refetchInterval: 10_000,
    // Vehicles stay on the map while the next answer is on its way.
    placeholderData: (prev) => prev,
  });
}
