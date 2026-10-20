import type { BikeStationsResponse } from "@sawa/shared";
import { Hono } from "hono";
import { VETURILO_CREDIT } from "../domain/routing/wheel-tour";
import { AppError } from "../lib/errors";
import type { BikeStationSource } from "../services/ports";

/** Veturilo stations for the map layer (#192); missing source → UPSTREAM_ERROR. */
export function createBikeStationRoutes(source: BikeStationSource | undefined) {
  return new Hono().get("/v1/bike-stations", async (c) => {
    if (!source) throw new AppError("UPSTREAM_ERROR", "Veturilo stations are not configured");
    const { stations, stale } = await source.stations();
    // Counts change by the minute; phones may share one answer for a little while.
    c.header("Cache-Control", "public, max-age=30");
    const body: BikeStationsResponse = {
      stations,
      ...(stale ? { stale: true } : {}),
      attribution: [VETURILO_CREDIT],
    };
    return c.json(body);
  });
}
