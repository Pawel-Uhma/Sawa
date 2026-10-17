import { describe, expect, it } from "vitest";
import type { MockStop } from "./mock-data";
import { dueIndex, LEAD_SEC, storyStartSec } from "./ride-clock";

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
});
