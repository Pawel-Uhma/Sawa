import { TrackVehiclesRequestSchema } from "@sawa/shared";
import { Hono } from "hono";
import { jsonBody } from "../lib/validate";
import type { VehicleTracker } from "../services/track-vehicles";

export function createVehicleRoutes(tracker: VehicleTracker) {
  return new Hono().post("/v1/vehicles/track", jsonBody(TrackVehiclesRequestSchema), async (c) => {
    c.header("Cache-Control", "no-store");
    return c.json(await tracker.track(c.req.valid("json")));
  });
}
