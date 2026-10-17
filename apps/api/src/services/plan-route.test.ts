import { HACKATHON_VENUE, RouteSchema } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { loadTransitData } from "../adapters/gtfs/load-transit";
import { createFilePlacesSource } from "../adapters/places/file-source";
import { createRoutePlanner } from "./plan-route";
import type { DepartureSource } from "./ports";

// Integration test on the committed data files (real Warsaw network and places).
const transit = loadTransitData(new URL("../../data/transit-graph.json.gz", import.meta.url));
const places = createFilePlacesSource(new URL("../../data/places.geojson", import.meta.url));
const NOW = new Date("2026-10-17T14:00:00+02:00");

describe("route planner on real data", () => {
  const planner = createRoutePlanner({ transit, places });

  it.each([
    30, 60, 120,
  ])("plans a %i-minute ride from 42 Warsaw past places", async (durationMin) => {
    const started = performance.now();
    const route = RouteSchema.parse(
      await planner.plan(
        { origin: HACKATHON_VENUE, durationMin, interests: ["war_uprising", "people"] },
        NOW,
      ),
    );
    expect(performance.now() - started).toBeLessThan(2000);
    expect(route.legs.length).toBeGreaterThan(0);
    expect(route.legs.length).toBeLessThanOrEqual(3);
    expect(route.places.length).toBeGreaterThanOrEqual(3);
    expect(route.totalMin).toBeLessThanOrEqual(durationMin * 1.1);
  });

  it("answers NOT_FOUND far from any stop", async () => {
    await expect(
      planner.plan(
        { origin: { lat: 52.9, lng: 22.5 }, durationMin: 60, interests: ["people"] },
        NOW,
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("moves the ride to the real first departure", async () => {
    const departures: DepartureSource = {
      nextDeparture: async (_stop, _line, after) => new Date(after.getTime() + 9 * 60_000),
    };
    const withReal = createRoutePlanner({ transit, places, departures });
    const request = { origin: HACKATHON_VENUE, durationMin: 60, interests: ["people" as const] };
    const route = await withReal.plan(request, NOW);
    const first = route.legs[0];
    const departMin = (new Date(first?.departAt ?? "").getTime() - NOW.getTime()) / 60_000;
    expect(departMin).toBeGreaterThanOrEqual(9);
    expect(departMin).toBeLessThan(20);
  });
});
