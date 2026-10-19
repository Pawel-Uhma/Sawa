import { RouteSchema } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { PLACES, searchInput } from "./__fixtures__/synthetic";
import { planRide } from "./beam-search";
import { alongWalkPaths, buildRoute, buildWalkRoute } from "./build-route";
import { MIN_STORY_GAP_SEC, STORY_MAX_SEC, storyWindowSec } from "./select-stories";
import type { LngLat, PlacePoint } from "./types";

const NOW = new Date("2026-10-17T14:00:00Z");

function routeFor(interests: string[], budgetMin: number) {
  const input = searchInput(PLACES, interests, budgetMin);
  const ride = planRide(input);
  if (!ride) throw new Error("no ride");
  return {
    ride,
    route: buildRoute({
      ride,
      network: input.network,
      placesById: input.placesById,
      now: NOW,
      attribution: ["test"],
    }),
  };
}

describe("buildRoute", () => {
  it("produces a route that matches the API contract", () => {
    expect(() => RouteSchema.parse(routeFor(["war_uprising"], 30).route)).not.toThrow();
  });

  it("orders places by ETA and gives the last one the time left, within the story bounds", () => {
    const { route, ride } = routeFor(["war_uprising"], 30);
    const etas = route.places.map((p) => p.etaSec);
    expect(etas).toEqual([...etas].sort((a, b) => a - b));
    const lastPlace = route.places[route.places.length - 1];
    const left = ride.elapsedSec - (lastPlace?.etaSec ?? 0);
    expect(lastPlace?.windowSec).toBeCloseTo(
      storyWindowSec(left, MIN_STORY_GAP_SEC, STORY_MAX_SEC.fun),
      -1,
    );
  });

  it("starts each leg shape at its boarding stop and stamps the departure time", () => {
    const { route } = routeFor(["architecture"], 30);
    const leg = route.legs[0];
    expect(leg?.lngLats[0]?.[0]).toBeCloseTo(leg?.fromStop.position.lng ?? Number.NaN, 6);
    expect(new Date(leg?.departAt ?? "").getTime()).toBeGreaterThan(NOW.getTime());
  });

  it("lists the stops passed on each ride in order, timed between boarding and alighting", () => {
    const { route } = routeFor(["war_uprising"], 30);
    const rides = route.legs.filter((leg) => leg.mode !== "walk");
    expect(rides.length).toBeGreaterThan(0);
    expect(rides.some((leg) => (leg.stops?.length ?? 0) > 0)).toBe(true);
    for (const leg of rides) {
      const start = new Date(leg.departAt).getTime();
      const end = start + leg.durationMin * 60_000 + 6_000;
      const times = (leg.stops ?? []).map((stop) => new Date(stop.at).getTime());
      expect(times).toEqual([...times].sort((a, b) => a - b));
      for (const t of times) {
        expect(t).toBeGreaterThanOrEqual(start);
        expect(t).toBeLessThanOrEqual(end);
      }
      const ids = (leg.stops ?? []).map((stop) => stop.id);
      expect(ids).not.toContain(leg.fromStop.id);
      expect(ids).not.toContain(leg.toStop.id);
    }
  });
});

describe("alongWalkPaths", () => {
  const place = (id: string, lat: number, lng: number): PlacePoint => ({
    id,
    name: id,
    position: { lat, lng },
    interests: ["history"],
    weight: 1,
  });
  // A walk north through `walked`; the street path goes round 270 m east (say, a railway).
  const [A, B] = [
    { lat: 52.25, lng: 21.0 },
    { lat: 52.26, lng: 21.0 },
  ];
  const walked = place("walked", 52.255, 21.0);
  const byLine = place("byLine", 52.252, 21.0);
  const byPath = place("byPath", 52.257, 21.004);
  const placesById = new Map([walked, byLine, byPath].map((p) => [p.id, p]));
  const path: LngLat[] = [
    [21.0, 52.25],
    [21.004, 52.25],
    [21.004, 52.26],
    [21.0, 52.26],
  ];
  const along = {
    placesById,
    interests: new Set(["history"]),
    now: NOW,
    storyGapSec: 10,
  };
  const route = buildWalkRoute({
    walk: {
      waypoints: [A, walked.position, B],
      places: [byLine, walked].map((p, i) => ({
        placeId: p.id,
        etaSec: 200 + 300 * i,
        distanceM: 0,
        legIndex: 0,
        score: 1,
      })),
      elapsedSec: 1000,
      score: 2,
    },
    placesById,
    now: NOW,
    attribution: ["test"],
    origin: A,
    destination: B,
    storyGapSec: 10,
  });

  it("collects the places by the real path instead of the straight line, keeping places walked to", () => {
    const drawn = alongWalkPaths(route, [path], along);
    expect(drawn.legs[0]?.lngLats).toEqual(path);
    expect(drawn.places.map((p) => p.placeId).sort()).toEqual(["byPath", "walked"]);
    const byPathEta = drawn.places.find((p) => p.placeId === "byPath")?.etaSec ?? 0;
    // About 0.63 of the way along the path, in the planner's 1000 s.
    expect(byPathEta).toBeGreaterThan(550);
    expect(byPathEta).toBeLessThan(700);
  });

  it("leaves the route as it is without paths", () => {
    expect(alongWalkPaths(route, [undefined], along)).toBe(route);
  });
});
