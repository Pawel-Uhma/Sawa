import { RouteSchema } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { PLACES, searchInput } from "./__fixtures__/synthetic";
import { planRide } from "./beam-search";
import { buildRoute } from "./build-route";

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

  it("orders places by ETA and gives each the time until the next one", () => {
    const { route, ride } = routeFor(["war_uprising"], 30);
    const etas = route.places.map((p) => p.etaSec);
    expect(etas).toEqual([...etas].sort((a, b) => a - b));
    const lastPlace = route.places[route.places.length - 1];
    expect(lastPlace && lastPlace.etaSec + lastPlace.windowSec).toBeCloseTo(ride.elapsedSec, -1);
  });

  it("starts each leg shape at its boarding stop and stamps the departure time", () => {
    const { route } = routeFor(["architecture"], 30);
    const leg = route.legs[0];
    expect(leg?.lngLats[0]?.[0]).toBeCloseTo(leg?.fromStop.position.lng ?? Number.NaN, 6);
    expect(new Date(leg?.departAt ?? "").getTime()).toBeGreaterThan(NOW.getTime());
  });
});
