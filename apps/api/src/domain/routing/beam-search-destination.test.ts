import { haversineM, type LatLng } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { ORIGIN_FAR_AWAY, PLACES, searchInput } from "./__fixtures__/synthetic";
import { planRide, type Ride } from "./beam-search";

/** Next to stop A12 (tram A, east of the crossing). */
const NEAR_A12 = { lat: 52.2302, lng: 21.048 };
/** Next to stop B15 (bus B, north of the crossing): needs a transfer at X. */
const NEAR_B15 = { lat: 52.266, lng: 21.0121 };
/** Next to stop B19, the end of bus B: about 40 min from the origin. */
const NEAR_B19 = { lat: 52.278, lng: 21.0121 };

const toInput = (destination: LatLng, interests: string[], budgetMin: number) => ({
  ...searchInput(PLACES, interests, budgetMin),
  destination,
});

function lastStopPosition(input: ReturnType<typeof toInput>, ride: Ride) {
  const leg = ride.legs[ride.legs.length - 1];
  const pattern = leg && input.network.patterns.get(leg.patternId);
  const stopId = pattern?.stops[leg.alightIndex]?.stopId ?? "";
  return input.network.stops.get(stopId)?.position;
}

describe("planRide with a destination", () => {
  it("ends near the destination within the budget", () => {
    const input = toInput(NEAR_A12, ["architecture"], 30);
    const ride = planRide(input);
    expect(ride?.endsAtDestination).toBe(true);
    const end = ride && lastStopPosition(input, ride);
    expect(end && haversineM(end, NEAR_A12)).toBeLessThanOrEqual(500);
    expect(ride?.elapsedSec).toBeGreaterThanOrEqual(0.8 * 30 * 60);
    expect(ride?.elapsedSec).toBeLessThanOrEqual(1.1 * 30 * 60);
  });

  it("transfers to reach a destination on another line", () => {
    const input = toInput(NEAR_B15, ["war_uprising"], 45);
    const ride = planRide(input);
    expect(ride?.endsAtDestination).toBe(true);
    const lines = ride?.legs.map((l) => input.network.patterns.get(l.patternId)?.line);
    expect(lines).toContain("A");
    expect(lines?.[lines.length - 1]).toBe("B");
  });

  it("stretches the budget when the destination is farther than it allows", () => {
    const ride = planRide(toInput(NEAR_B19, ["architecture"], 30));
    expect(ride?.endsAtDestination).toBe(true);
    expect(ride?.elapsedSec).toBeGreaterThan(1.1 * 30 * 60);
  });

  it("falls back to a free ride when no stop is near the destination", () => {
    const ride = planRide(toInput(ORIGIN_FAR_AWAY, ["architecture"], 30));
    expect(ride?.endsAtDestination).toBe(false);
    expect(ride?.legs.length).toBeGreaterThan(0);
  });

  it("leaves endsAtDestination unset without a destination", () => {
    const ride = planRide(searchInput(PLACES, ["architecture"], 30));
    expect(ride?.endsAtDestination).toBeUndefined();
  });
});
