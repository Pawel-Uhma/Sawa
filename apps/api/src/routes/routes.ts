import { PlanRouteRequestSchema, type Route, RouteSchema } from "@sawa/shared";
import { Hono } from "hono";
import { jsonBody } from "../lib/validate";
import mockRoute from "./__fixtures__/route-mock.json";

// TODO(T-13): replace the fixture with the planner service.
const MOCK_ROUTE: Route = RouteSchema.parse(mockRoute);

export const routeRoutes = new Hono()
  .post("/v1/routes/plan", jsonBody(PlanRouteRequestSchema), (c) => c.json(MOCK_ROUTE))
  .get("/v1/routes/demo", (c) => c.json(MOCK_ROUTE));
