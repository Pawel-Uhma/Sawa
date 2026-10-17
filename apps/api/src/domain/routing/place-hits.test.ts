import { describe, expect, it } from "vitest";
import { place, syntheticNetwork } from "./__fixtures__/synthetic";
import { computePlaceHits } from "./place-hits";

describe("computePlaceHits", () => {
  const network = syntheticNetwork();

  it("finds a place within 150 m and interpolates its time between stops", () => {
    // Halfway between A2 (21.008) and A3 (21.012), ~55 m north of the line.
    const hits = computePlaceHits(network, [place("p", 21.01, 52.2305, [])]).get("A-0");
    expect(hits).toHaveLength(1);
    expect(hits?.[0]?.atSec).toBeCloseTo(225, 0);
    expect(hits?.[0]?.distanceM).toBeCloseTo(56, 0);
  });

  it("ignores places farther than 150 m or beyond the terminus", () => {
    const hits = computePlaceHits(network, [
      place("far", 21.01, 52.2325, []),
      place("before-start", 20.99, 52.23, []),
    ]);
    expect(hits.get("A-0")).toBeUndefined();
  });

  it("sorts hits by time along the ride", () => {
    const hits = computePlaceHits(network, [
      place("late", 21.05, 52.23, []),
      place("early", 21.01, 52.23, []),
    ]);
    expect(hits.get("A-0")?.map((h) => h.placeId)).toEqual(["early", "late"]);
  });
});
