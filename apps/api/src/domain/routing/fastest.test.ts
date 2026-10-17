import { describe, expect, it } from "vitest";
import { ORIGIN_NEAR_A0, PLACES, searchInput } from "./__fixtures__/synthetic";
import { planRide } from "./beam-search";
import { planFastest } from "./fastest";

/** Next to stop A12 (tram A, east of the crossing). */
const NEAR_A12 = { lat: 52.2302, lng: 21.048 };
/** Next to stop B15 (bus B, north of the crossing): needs a transfer at X. */
const NEAR_B15 = { lat: 52.266, lng: 21.0121 };

const input = (destination: { lat: number; lng: number }) => ({
  ...searchInput(PLACES, ["architecture", "war_uprising"], 30),
  destination,
});

describe("planFastest", () => {
  it("rides straight to a destination on the same line", () => {
    const fastest = planFastest(input(NEAR_A12));
    expect(fastest.kind).toBe("ride");
    if (fastest.kind !== "ride") return;
    const { ride } = fastest;
    expect(ride.legs).toHaveLength(1);
    expect(ride.endsAtDestination).toBe(true);
    // Walk to A0, half the 10-min headway, 12 stops × 90 s.
    expect(ride.elapsedSec).toBeCloseTo(ride.walkSec + 300 + 12 * 90, 0);
  });

  it("transfers when the destination is on another line", () => {
    const i = input(NEAR_B15);
    const fastest = planFastest(i);
    if (fastest.kind !== "ride") throw new Error("expected a ride");
    const lines = fastest.ride.legs.map((l) => i.network.patterns.get(l.patternId)?.line);
    expect(lines).toEqual(["A", "B"]);
  });

  it("is never slower than a sightseeing ride to the same place", () => {
    const i = input(NEAR_B15);
    const fastest = planFastest(i);
    const scenic = planRide({ ...i, budgetSec: 45 * 60 });
    if (fastest.kind !== "ride" || !scenic) throw new Error("expected rides");
    expect(fastest.ride.elapsedSec).toBeLessThanOrEqual(scenic.elapsedSec);
  });

  it("still collects places on the way for stories", () => {
    const fastest = planFastest(input(NEAR_A12));
    if (fastest.kind !== "ride") throw new Error("expected a ride");
    expect(fastest.ride.places.some((p) => p.placeId.startsWith("a-east"))).toBe(true);
  });

  it("walks when the destination is close", () => {
    const fastest = planFastest(input({ lat: 52.2301, lng: 21.003 }));
    expect(fastest.kind).toBe("walk");
    if (fastest.kind !== "walk") return;
    expect(fastest.walk.waypoints).toEqual([ORIGIN_NEAR_A0, { lat: 52.2301, lng: 21.003 }]);
  });
});
