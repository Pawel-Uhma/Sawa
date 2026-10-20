import { describe, expect, it } from "vitest";
import {
  isWheelMode,
  MIN_WHEEL_STORY_GAP_SEC,
  visibleRadiusScaleOf,
  wheelReachKm,
  wheelSec,
  wheelStoryTimes,
} from "./travel-modes";

describe("travel modes", () => {
  it("tells bike and car from walking and transit", () => {
    expect(isWheelMode("bike")).toBe(true);
    expect(isWheelMode("car")).toBe(true);
    expect(isWheelMode("walk")).toBe(false);
    expect(isWheelMode(undefined)).toBe(false);
  });

  it("is faster by car than by bike", () => {
    expect(wheelSec("car", 1000)).toBeLessThan(wheelSec("bike", 1000));
    // 1 km by bike: a few minutes, not seconds or an hour
    expect(wheelSec("bike", 1000)).toBeGreaterThan(200);
    expect(wheelSec("bike", 1000)).toBeLessThan(400);
  });

  it("shortens story gaps and lengths with speed, down to a floor", () => {
    expect(wheelStoryTimes("bike", 40, 120)).toEqual({ storyGapSec: 30, storyMaxSec: 90 });
    expect(wheelStoryTimes("car", 90, 300)).toEqual({ storyGapSec: 45, storyMaxSec: 150 });
    expect(wheelStoryTimes("car", 30, 30).storyGapSec).toBe(MIN_WHEEL_STORY_GAP_SEC);
    expect(wheelStoryTimes("car", 30, 30).storyMaxSec).toBe(MIN_WHEEL_STORY_GAP_SEC);
  });

  it("reaches farther by car, within a cap", () => {
    expect(wheelReachKm("car", 60)).toBeGreaterThan(wheelReachKm("bike", 60));
    expect(wheelReachKm("car", 240)).toBe(30);
    expect(wheelReachKm("bike", 5)).toBe(4);
  });

  it("sees farther off the road from a car than from a bike, and only then than on foot", () => {
    expect(visibleRadiusScaleOf("walk")).toBe(1);
    expect(visibleRadiusScaleOf("tram")).toBe(1);
    expect(visibleRadiusScaleOf("bike")).toBeGreaterThan(1);
    expect(visibleRadiusScaleOf("car")).toBeGreaterThan(visibleRadiusScaleOf("bike"));
  });
});
