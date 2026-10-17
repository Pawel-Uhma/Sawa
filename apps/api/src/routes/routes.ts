import { HACKATHON_VENUE, type PlanRouteRequest, PlanRouteRequestSchema } from "@sawa/shared";
import { Hono } from "hono";
import { jsonBody } from "../lib/validate";
import type { RoutePlanner } from "../services/plan-route";

/** The ride shown on /demo: from 42 Warsaw, one hour, the strongest topics of the area. */
export const DEMO_REQUEST: PlanRouteRequest = {
  origin: HACKATHON_VENUE,
  durationMin: 60,
  interests: ["war_uprising", "everyday_life", "people"],
};

export function createRouteRoutes(planner: RoutePlanner, clock: () => Date = () => new Date()) {
  return new Hono()
    .post("/v1/routes/plan", jsonBody(PlanRouteRequestSchema), async (c) =>
      c.json(await planner.plan(c.req.valid("json"), clock())),
    )
    .get("/v1/routes/demo", async (c) => c.json(await planner.plan(DEMO_REQUEST, clock())));
}
