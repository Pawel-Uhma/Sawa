import { RouteSchema } from "@sawa/shared";
import mockRoute from "./__fixtures__/route-mock.json";
import type { RoutePlanner } from "./plan-route";

/** Always returns the same hand-made route along al. Solidarności. For tests. */
export function createFakeRoutePlanner(): RoutePlanner {
  const route = RouteSchema.parse(mockRoute);
  return { plan: async () => route };
}
