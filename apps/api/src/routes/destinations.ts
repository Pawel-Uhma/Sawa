import { DestinationQuerySchema } from "@sawa/shared";
import { Hono } from "hono";
import { queryParams } from "../lib/validate";
import type { DestinationService } from "../services/search-destinations";

export function createDestinationRoutes(destinations: DestinationService) {
  return new Hono().get("/v1/destinations", queryParams(DestinationQuerySchema), async (c) => {
    c.header("Cache-Control", "public, max-age=3600");
    return c.json({ results: await destinations.search(c.req.valid("query").q) });
  });
}
