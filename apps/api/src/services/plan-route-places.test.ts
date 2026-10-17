import { HACKATHON_VENUE, type PlanRouteRequest } from "@sawa/shared";
import { describe, expect, it, vi } from "vitest";
import { loadTransitCalendar } from "../adapters/gtfs/load-transit";
import { createFilePlacesRepository } from "../adapters/places-file/file-places-repository";
import type { PlaceSummary } from "../domain/place";
import { AppError } from "../lib/errors";
import { createRoutePlanner } from "./plan-route";
import type { PlacesRepository } from "./ports";

// Where the planner gets places from: the repository, its cache and the file fallback.
const transit = loadTransitCalendar(new URL("../../data/transit/", import.meta.url)).forDate(
  "2026-10-17",
);
const file = createFilePlacesRepository(new URL("../../data/places.geojson", import.meta.url));
const NOW = new Date("2026-10-17T14:00:00+02:00");
const REQUEST: PlanRouteRequest = {
  origin: HACKATHON_VENUE,
  durationMin: 30,
  interests: ["historical", "cultural"],
};

/** The committed places under new ids, standing in for places that exist only in Supabase. */
function fakeRepository(prefix: string) {
  const listInBBox = vi.fn<PlacesRepository["listInBBox"]>(async (bbox) =>
    (await file.listInBBox(bbox)).map((p): PlaceSummary => ({ ...p, id: `${prefix}${p.id}` })),
  );
  return { listInBBox };
}

const silentLogger = () => ({ info: vi.fn(), warn: vi.fn() });
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("route planner places", () => {
  it("takes places from the repository", async () => {
    const db = fakeRepository("db-");
    const planner = createRoutePlanner({ transit, places: db, fallbackPlaces: file });

    const route = await planner.plan(REQUEST, NOW);

    expect(route.places.length).toBeGreaterThan(0);
    expect(route.places.every((p) => p.placeId.startsWith("db-"))).toBe(true);
  });

  it("falls back to the file and logs when the repository fails", async () => {
    const failing = {
      listInBBox: vi.fn(async () => {
        throw new AppError("UPSTREAM_TIMEOUT", "Supabase places_in_bbox failed");
      }),
    };
    const logger = silentLogger();
    const planner = createRoutePlanner({ transit, places: failing, fallbackPlaces: file, logger });

    const route = await planner.plan(REQUEST, NOW);

    expect(route.places.length).toBeGreaterThan(0);
    expect(route.places.some((p) => p.placeId.startsWith("db-"))).toBe(false);
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it("rejects when the repository fails and there is no fallback", async () => {
    const failing = {
      listInBBox: async () => {
        throw new AppError("UPSTREAM_ERROR", "Supabase places_in_bbox failed");
      },
    };
    const planner = createRoutePlanner({ transit, places: failing });

    await expect(planner.plan(REQUEST, NOW)).rejects.toMatchObject({ code: "UPSTREAM_ERROR" });
  });

  it("asks the repository once per area until the cache expires", async () => {
    const db = fakeRepository("db-");
    let now = 0;
    const planner = createRoutePlanner({ transit, places: db, clock: () => now });

    await planner.plan(REQUEST, NOW);
    await planner.plan({ ...REQUEST, origin: { lat: 52.236, lng: 20.979 } }, NOW);
    expect(db.listInBBox).toHaveBeenCalledOnce();

    now += 11 * 60_000;
    await planner.plan(REQUEST, NOW);
    await flush();
    expect(db.listInBBox).toHaveBeenCalledTimes(2);
  });

  it("serves new places after a refresh finds the set changed", async () => {
    let prefix = "old-";
    const listInBBox = vi.fn<PlacesRepository["listInBBox"]>(async (bbox) =>
      (await file.listInBBox(bbox)).map((p) => ({ ...p, id: `${prefix}${p.id}` })),
    );
    let now = 0;
    const planner = createRoutePlanner({ transit, places: { listInBBox }, clock: () => now });
    expect((await planner.plan(REQUEST, NOW)).places[0]?.placeId).toMatch(/^old-/);

    prefix = "new-";
    now += 11 * 60_000;
    // The request that notices the expiry still gets the old places; the refresh runs behind it.
    expect((await planner.plan(REQUEST, NOW)).places[0]?.placeId).toMatch(/^old-/);
    await vi.waitFor(async () =>
      expect((await planner.plan(REQUEST, NOW)).places[0]?.placeId).toMatch(/^new-/),
    );
  });
});
