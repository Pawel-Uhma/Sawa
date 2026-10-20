import { HACKATHON_VENUE, haversineM, type PlanRouteRequest, RouteSchema } from "@sawa/shared";
import { describe, expect, it, vi } from "vitest";
import { loadTransitCalendar } from "../adapters/gtfs/load-transit";
import { createFilePlacesRepository } from "../adapters/places-file/file-places-repository";
import { createRoutePlanner, type RoutePlanner } from "./plan-route";
import { withWaypoints } from "./plan-waypoints";

// Integration test on the committed data files (real Warsaw network and places).
const transit = loadTransitCalendar(new URL("../../data/transit/", import.meta.url)).forDate(
  "2026-10-17",
);
const places = createFilePlacesRepository(new URL("../../data/places.geojson", import.meta.url));
const NOW = new Date("2026-10-17T14:00:00+02:00");
const planner = withWaypoints(createRoutePlanner({ transit, places }));

/** A real place this far (m) from the venue, roughly. */
async function placeAround(distanceM: number) {
  const all = await places.listInBBox({ minLng: 20.8, minLat: 52.1, maxLng: 21.2, maxLat: 52.35 });
  const found = all.find(
    (p) => Math.abs(haversineM(p.position, HACKATHON_VENUE) - distanceM) < 200,
  );
  if (!found) throw new Error(`no place ~${distanceM} m from the venue`);
  return found;
}

const passes = (
  route: { legs: { lngLats: [number, number][] }[] },
  at: { lat: number; lng: number },
) => route.legs.some((l) => l.lngLats.some(([lng, lat]) => haversineM({ lat, lng }, at) <= 600));

describe("route through waypoints", () => {
  it("asks the planner as before when there are no waypoints", async () => {
    const plan = vi.fn<RoutePlanner["plan"]>(async () => ({
      id: "x",
      legs: [],
      places: [],
      totalMin: 0,
      endsAtStart: false,
      attribution: [],
    }));
    const request: PlanRouteRequest = {
      origin: HACKATHON_VENUE,
      durationMin: 30,
      interests: ["historical"],
    };
    await withWaypoints({ plan }).plan(request, NOW);
    expect(plan).toHaveBeenCalledWith(request, NOW);
  });

  it("passes a waypoint place, tells its story there, and keeps to the time", async () => {
    const stop = await placeAround(2500);
    const durationMin = 60;
    const route = RouteSchema.parse(
      await planner.plan(
        {
          origin: HACKATHON_VENUE,
          durationMin,
          interests: ["historical"],
          waypoints: [{ ...stop.position, placeId: stop.id, name: stop.name }],
        },
        NOW,
      ),
    );
    expect(passes(route, stop.position)).toBe(true);
    const told = route.places.find((p) => p.placeId === stop.id);
    expect(told).toBeDefined();
    expect(route.places.filter((p) => p.placeId === stop.id)).toHaveLength(1);
    const etas = route.places.map((p) => p.etaSec);
    expect(etas).toEqual([...etas].sort((a, b) => a - b));
    expect(route.totalMin).toBeLessThanOrEqual(durationMin * 1.2);
  });

  it("goes through two waypoints in the given order and back to the start", async () => {
    const first = await placeAround(1500);
    const second = await placeAround(3000);
    const route = RouteSchema.parse(
      await planner.plan(
        {
          origin: HACKATHON_VENUE,
          durationMin: 90,
          interests: ["historical"],
          returnToStart: true,
          waypoints: [
            { ...first.position, placeId: first.id, name: first.name },
            { ...second.position, placeId: second.id, name: second.name },
          ],
        },
        NOW,
      ),
    );
    const firstAt = route.places.find((p) => p.placeId === first.id)?.etaSec ?? -1;
    const secondAt = route.places.find((p) => p.placeId === second.id)?.etaSec ?? -1;
    expect(firstAt).toBeGreaterThan(0);
    expect(secondAt).toBeGreaterThan(firstAt);
    expect(route.endsAtStart).toBe(true);
  });

  it("plans the fastest way through a waypoint to the destination without a duration", async () => {
    const stop = await placeAround(1500);
    const destination = { lat: 52.2297, lng: 21.0122 };
    const route = RouteSchema.parse(
      await planner.plan(
        {
          origin: HACKATHON_VENUE,
          interests: ["historical"],
          destination,
          waypoints: [stop.position],
        },
        NOW,
      ),
    );
    expect(passes(route, stop.position)).toBe(true);
    expect(route.endsAtDestination).toBe(true);
  });
});
