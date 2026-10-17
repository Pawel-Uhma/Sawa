import { type PlanRouteRequest, type Route, RouteSchema } from "@sawa/shared";
import { useMutation } from "@tanstack/react-query";
import { API_TIMEOUT_MS, api } from "@/lib/api";

/** POST /v1/routes/plan; the planner may take a while, so it gets twice the usual timeout. */
export function useRoutePlan() {
  return useMutation({
    mutationFn: async (request: PlanRouteRequest): Promise<Route> => {
      const res = await api.v1.routes.plan.$post(
        { json: request },
        { init: { signal: AbortSignal.timeout(API_TIMEOUT_MS * 2) } },
      );
      if (!res.ok) throw new Error(`POST /v1/routes/plan: ${res.status}`);
      return RouteSchema.parse(await res.json());
    },
  });
}
