import { PlacesQuerySchema } from "@sawa/shared";
import { Hono } from "hono";
import { queryParams } from "../lib/validate";
import { getPlace, listPlaces } from "../services/places";
import type { PlacesRepository } from "../services/ports";

// Places change only when the seed runs again, so clients and CDNs may cache them.
const CACHE_CONTROL = "public, max-age=300";

export function placeRoutes(places: PlacesRepository) {
  return new Hono()
    .get("/v1/places", queryParams(PlacesQuerySchema), async (c) => {
      c.header("Cache-Control", CACHE_CONTROL);
      return c.json(await listPlaces(places, c.req.valid("query")));
    })
    .get("/v1/places/:id", async (c) => {
      c.header("Cache-Control", CACHE_CONTROL);
      return c.json(await getPlace(places, c.req.param("id")));
    });
}
