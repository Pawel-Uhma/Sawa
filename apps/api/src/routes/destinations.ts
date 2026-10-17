import { DestinationQuerySchema } from "@sawa/shared";
import { Hono } from "hono";
import { queryParams } from "../lib/validate";
import type { DestinationService } from "../services/search-destinations";

export function createDestinationRoutes(destinations: DestinationService) {
  return new Hono().get("/v1/destinations", queryParams(DestinationQuerySchema), async (c) => {
    // Short on purpose: the user cannot clear an old answer from the browser cache, and the
    // server keeps its own cache (1 h) anyway.
    c.header("Cache-Control", "private, max-age=60");
    return c.json({ results: await destinations.search(c.req.valid("query").q) });
  });
}
