import { describe, expect, it } from "vitest";
import { DURATION_STOPS_MIN } from "./mock-data";
import { clampDuration, durationStops, stopPercent } from "./ride-duration";

describe("durationStops", () => {
  it("keeps the full scale without a destination", () => {
    expect(durationStops(null)).toBe(DURATION_STOPS_MIN);
  });

  it("starts the scale at the fastest route and drops the steps below it", () => {
    expect(durationStops(20).slice(0, 3)).toEqual([20, 25, 30]);
    expect(durationStops(20)).not.toContain(15);
    expect(durationStops(20)).not.toContain(5);
  });

  it("keeps the fastest route itself when it is not a regular step", () => {
    expect(durationStops(42)[0]).toBe(42);
    expect(durationStops(42)[1]).toBe(45);
  });
});

describe("clampDuration", () => {
  it("leaves the time alone without a destination", () => {
    expect(clampDuration(5, null)).toBe(5);
  });

  it("raises a time that is shorter than the fastest route (T-117)", () => {
    expect(clampDuration(5, 20)).toBe(20);
  });

  it("keeps a time that is already longer than the fastest route", () => {
    expect(clampDuration(90, 20)).toBe(90);
  });
});

describe("stopPercent", () => {
  it("places the first step at 0 and the last at 100", () => {
    const stops = durationStops(20);
    expect(stopPercent(20, stops)).toBe(0);
    expect(stopPercent(stops[stops.length - 1], stops)).toBe(100);
  });

  it("does not divide by zero for a single step", () => {
    expect(stopPercent(300, [300])).toBe(0);
  });
});
