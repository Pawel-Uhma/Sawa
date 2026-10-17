import { describe, expect, it } from "vitest";
import { line, PLACES, reversed, searchInput } from "./__fixtures__/synthetic";
import { planRide, type Ride } from "./beam-search";
import { createNetwork } from "./network";
import { computePlaceHits } from "./place-hits";
import type { Network } from "./types";

/**
 * The synthetic cross plus line C from the north end of B (group "B9") straight back to the
 * first stop of A (group "A0"): a loop A → B → C exists without riding anything twice.
 */
function triangleNetwork(): Network {
  const base = searchInput(PLACES, [], 60).network;
  const [fromLng, fromLat, toLng, toLat] = [21.012, 52.248, 21.0, 52.23];
  const c = line(
    "C",
    "bus",
    (i) => [fromLng + ((toLng - fromLng) * i) / 19, fromLat + ((toLat - fromLat) * i) / 19],
    (i) => (i === 0 ? "B9" : i === 19 ? "A0" : `C${i}`),
  );
  const cBack = reversed(c);
  return createNetwork(
    [...base.stops.values(), ...c.stops, ...cBack.stops],
    [...base.patterns.values(), c.pattern, cBack.pattern],
  );
}

function triangleLoop(budgetMin: number) {
  const network = triangleNetwork();
  return {
    ...searchInput(PLACES, [], budgetMin),
    network,
    hitsByPattern: computePlaceHits(network, PLACES),
    returnToStart: true,
  };
}

/** Hops between stop groups ridden more than once (either way). */
function retracedHops(network: Network, ride: Ride): string[] {
  const seen = new Set<string>();
  const twice: string[] = [];
  for (const leg of ride.legs) {
    const stops = network.patterns.get(leg.patternId)?.stops ?? [];
    for (let i = leg.boardIndex + 1; i <= leg.alightIndex; i++) {
      const a = network.stops.get(stops[i - 1]?.stopId ?? "")?.groupId ?? "";
      const b = network.stops.get(stops[i]?.stopId ?? "")?.groupId ?? "";
      const key = [a, b].sort().join("~");
      if (seen.has(key)) twice.push(key);
      seen.add(key);
    }
  }
  return twice;
}

describe("planRide without backtracking", () => {
  it("rides out and back on the same line when nothing penalises it", () => {
    const input = triangleLoop(50);
    const ride = planRide(input, { backtrackPenalty: 0 });
    expect(ride?.endsAtStart).toBe(true);
    expect(retracedHops(input.network, ride as Ride).length).toBeGreaterThan(0);
  });

  it("comes back another way when one exists", () => {
    const input = triangleLoop(50);
    const ride = planRide(input);
    expect(ride?.endsAtStart).toBe(true);
    expect(retracedHops(input.network, ride as Ride)).toEqual([]);
    const lines = ride?.legs.map((l) => input.network.patterns.get(l.patternId)?.line);
    expect(lines).toContain("C");
  });

  it("still comes back the same way from a dead end", () => {
    const input = { ...searchInput(PLACES, ["architecture"], 30), returnToStart: true };
    const ride = planRide(input);
    expect(ride?.endsAtStart).toBe(true);
    expect(retracedHops(input.network, ride as Ride).length).toBeGreaterThan(0);
  });
});
