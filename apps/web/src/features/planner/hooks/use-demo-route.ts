import { type Route, RouteSchema } from "@sawa/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const ROUTE_TIMEOUT_MS = 10_000;

/** Fixed demo route from GET /v1/routes/demo (mock until T-13). */
export function useDemoRoute() {
  return useQuery({
    queryKey: ["route", "demo"],
    queryFn: async (): Promise<Route> => {
      const res = await api.v1.routes.demo.$get(undefined, {
        init: { signal: AbortSignal.timeout(ROUTE_TIMEOUT_MS) },
      });
      if (!res.ok) throw new Error(`GET /v1/routes/demo: ${res.status}`);
      return RouteSchema.parse(await res.json());
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
}
