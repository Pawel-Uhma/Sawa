import { haversineM } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { ORIGIN_NEAR_A0, PLACES, searchInput } from "./__fixtures__/synthetic";
import { planRide } from "./beam-search";

const loopInput = (interests: string[], budgetMin: number) => ({
  ...searchInput(PLACES, interests, budgetMin),
  returnToStart: true,
});

function lastStopPosition(
  input: ReturnType<typeof loopInput>,
  ride: NonNullable<ReturnType<typeof planRide>>,
) {
  const leg = ride.legs[ride.legs.length - 1];
  const pattern = leg && input.network.patterns.get(leg.patternId);
  const stopId = pattern?.stops[leg.alightIndex]?.stopId ?? "";
  return input.network.stops.get(stopId)?.position;
}

describe("planRide with returnToStart", () => {
  it("ends near the origin within the loop budget", () => {
    const input = loopInput(["architecture"], 30);
    const ride = planRide(input);
    expect(ride?.endsAtStart).toBe(true);
    const end = ride && lastStopPosition(input, ride);
    expect(end && haversineM(end, ORIGIN_NEAR_A0)).toBeLessThanOrEqual(500);
    expect(ride?.elapsedSec).toBeGreaterThanOrEqual(0.8 * 30 * 60);
    expect(ride?.elapsedSec).toBeLessThanOrEqual(1.1 * 30 * 60);
  });

  it("can come back on the same line in the other direction", () => {
    const input = loopInput(["architecture"], 30);
    const ride = planRide(input);
    const lines = ride?.legs.map((l) => input.network.patterns.get(l.patternId)?.line);
    expect(lines?.[0]).toBe(lines?.[lines.length - 1]);
    expect(ride?.legs[0]?.patternId).not.toBe(ride?.legs[ride.legs.length - 1]?.patternId);
  });

  it("still collects matching places on the way out", () => {
    const ride = planRide(loopInput(["war_uprising"], 45));
    expect(ride?.endsAtStart).toBe(true);
    expect(ride?.places.some((p) => p.placeId.startsWith("b-north"))).toBe(true);
  });

  it("does not count places twice on the way back", () => {
    const ride = planRide(loopInput(["architecture"], 45));
    const ids = ride?.places.map((p) => p.placeId) ?? [];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("marks a normal ride that does not come back", () => {
    const ride = planRide(searchInput(PLACES, ["architecture"], 30));
    expect(ride?.endsAtStart).toBe(false);
  });
});
