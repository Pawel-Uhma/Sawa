import { describe, expect, it } from "vitest";
import type { LngLat } from "./mock-data";
import { sideOfPath } from "./side";

// Riding north along a meridian in Warsaw.
const north: LngLat[] = [
  [21.0, 52.23],
  [21.0, 52.24],
];

describe("sideOfPath", () => {
  it("puts a place west of a northbound ride on the left", () => {
    expect(sideOfPath(north, [20.999, 52.235])).toBe("left");
  });

  it("puts a place east of it on the right", () => {
    expect(sideOfPath(north, [21.001, 52.235])).toBe("right");
  });

  it("flips with the direction of the ride", () => {
    expect(sideOfPath([...north].reverse(), [20.999, 52.235])).toBe("right");
  });

  it("does not guess for a place far from the path or on it", () => {
    expect(sideOfPath(north, [20.99, 52.235])).toBeUndefined();
    expect(sideOfPath(north, [21.0, 52.235])).toBeUndefined();
    expect(sideOfPath([[21.0, 52.23]], [20.999, 52.235])).toBeUndefined();
  });
});
