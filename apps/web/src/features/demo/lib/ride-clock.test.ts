import { describe, expect, it } from "vitest";
import type { MockStop } from "./mock-data";
import {
  ARRIVE_M,
  dueIndex,
  isAt,
  isClockRunning,
  LEAD_SEC,
  storyStartSec,
  waitSec,
} from "./ride-clock";

const stop = (etaSec: number) => ({ etaSec, etaMin: Math.round(etaSec / 60) }) as MockStop;

describe("ride clock", () => {
  const stops = [stop(10), stop(120), stop(300)];

  it("starts a story a little before the place", () => {
    expect(storyStartSec(stop(120))).toBe(120 - LEAD_SEC);
    expect(storyStartSec(stop(5))).toBe(0);
  });

  it("is due at the last place whose story should have started", () => {
    expect(dueIndex(stops, 0)).toBe(0);
    expect(dueIndex(stops, 120 - LEAD_SEC - 1)).toBe(0);
    expect(dueIndex(stops, 120 - LEAD_SEC)).toBe(1);
    expect(dueIndex(stops, 1000)).toBe(2);
  });

  it("waits for the first place before Sawa talks", () => {
    const far = [stop(300), stop(600)];
    expect(waitSec(far, 0)).toBe(300 - LEAD_SEC);
    expect(waitSec(far, 300 - LEAD_SEC - 1)).toBe(1);
    expect(waitSec(far, 300 - LEAD_SEC)).toBeNull();
    expect(waitSec(stops, 0)).toBeNull();
    expect(waitSec([], 0)).toBeNull();
  });

  it("counts GPS within ARRIVE_M of a place as being there", () => {
    const place = { coord: [21, 52.25] as [number, number] };
    expect(isAt({ lat: 52.25, lng: 21 }, place)).toBe(true);
    // 0.001° of latitude is about 111 m
    expect(isAt({ lat: 52.25 + ARRIVE_M / 111_000 - 0.0002, lng: 21 }, place)).toBe(true);
    expect(isAt({ lat: 52.255, lng: 21 }, place)).toBe(false);
  });
});

describe("isClockRunning", () => {
  const stops = [stop(60), stop(300)];

  it("runs before the first place even while Sawa is quiet", () => {
    expect(isClockRunning(stops, 10, false)).toBe(true);
  });

  it("stops with Sawa once she may talk", () => {
    expect(isClockRunning(stops, 120, false)).toBe(false);
    expect(isClockRunning(stops, 120, true)).toBe(true);
  });

  it("does not run without a route", () => {
    expect(isClockRunning([], 0, true)).toBe(false);
  });
});
