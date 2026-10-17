import { HACKATHON_VENUE, haversineM, RouteSchema } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { loadTransitData } from "../adapters/gtfs/load-transit";
import { createFilePlacesRepository } from "../adapters/places-file/file-places-repository";
import { createRoutePlanner } from "./plan-route";
import type { DepartureSource } from "./ports";

// Integration test on the committed data files (real Warsaw network and places).
const transit = loadTransitData(new URL("../../data/transit-graph.json.gz", import.meta.url));
const places = createFilePlacesRepository(new URL("../../data/places.geojson", import.meta.url));
const NOW = new Date("2026-10-17T14:00:00+02:00");

describe("route planner on real data", () => {
  const planner = createRoutePlanner({ transit, places });

  it.each([
    30, 60, 120,
  ])("plans a %i-minute ride from 42 Warsaw past places", async (durationMin) => {
    const started = performance.now();
    const route = RouteSchema.parse(
      await planner.plan(
        { origin: HACKATHON_VENUE, durationMin, interests: ["historical", "cultural"] },
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
        { origin: { lat: 52.9, lng: 22.5 }, durationMin: 60, interests: ["historical"] },
        NOW,
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it.each([60, 120])("plans a %i-minute loop that ends near the start", async (durationMin) => {
    const route = RouteSchema.parse(
      await planner.plan(
        { origin: HACKATHON_VENUE, durationMin, interests: ["historical"], returnToStart: true },
        NOW,
      ),
    );
    expect(route.endsAtStart).toBe(true);
    const end = route.legs[route.legs.length - 1]?.toStop.position;
    expect(end && haversineM(end, HACKATHON_VENUE)).toBeLessThanOrEqual(600);
    expect(route.totalMin).toBeGreaterThanOrEqual(durationMin * 0.8);
    expect(route.totalMin).toBeLessThanOrEqual(durationMin * 1.1);
  });

  it("moves the ride to the real first departure", async () => {
    const departures: DepartureSource = {
      nextDeparture: async (_stop, _line, after) => new Date(after.getTime() + 9 * 60_000),
    };
    const withReal = createRoutePlanner({ transit, places, departures });
    const request = {
      origin: HACKATHON_VENUE,
      durationMin: 60,
      interests: ["historical" as const],
    };
    const route = await withReal.plan(request, NOW);
    const first = route.legs[0];
    const departMin = (new Date(first?.departAt ?? "").getTime() - NOW.getTime()) / 60_000;
    expect(departMin).toBeGreaterThanOrEqual(9);
    expect(departMin).toBeLessThan(20);
  });
});
