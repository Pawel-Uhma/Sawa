import { describe, expect, it } from "vitest";
import { bearingDeg, MIN_HEADING_MOVE_M, NO_HEADING, nextHeading } from "./navigation";

describe("bearingDeg", () => {
  it("measures clockwise from north", () => {
    expect(bearingDeg([21, 52], [21, 52.01])).toBeCloseTo(0);
    expect(bearingDeg([21, 52], [21.01, 52])).toBeCloseTo(90);
    expect(bearingDeg([21, 52], [21, 51.99])).toBeCloseTo(180);
    expect(bearingDeg([21, 52], [20.99, 52])).toBeCloseTo(270);
  });
});

describe("nextHeading", () => {
  it("takes the GPS course when the phone gives one", () => {
    expect(nextHeading(NO_HEADING, [21, 52], 370).heading).toBe(10);
  });

  it("ignores a NaN course and waits for a move", () => {
    const first = nextHeading(NO_HEADING, [21, 52], Number.NaN);
    expect(first.heading).toBeNull();
    const moved = nextHeading(first, [21, 52.001], null);
    expect(moved.heading).toBeCloseTo(0);
  });

  it("keeps the heading through GPS jitter shorter than the threshold", () => {
    const state = { anchor: [21, 52] as [number, number], heading: 90 };
    const jitterDeg = MIN_HEADING_MOVE_M / 2 / 110_540;
    expect(nextHeading(state, [21, 52 + jitterDeg])).toBe(state);
  });
});
