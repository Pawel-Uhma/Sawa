import { haversineM } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { place } from "./__fixtures__/synthetic";
import { planWalk, toSegment } from "./walk-tour";

const ORIGIN = { lat: 52.23, lng: 21.0 };
// ~70 m per 0.001° of longitude here; walking 1.2 m/s × 1.3 detour ≈ 0.92 m/s.
const PLACES = [
  place("east-1", 21.002, 52.23, ["historical"]), // ~140 m east
  place("east-2", 21.004, 52.23, ["historical"]), // ~275 m east
  place("north", 21.0, 52.232, ["cultural"]), // ~220 m north
  place("far", 21.05, 52.23, ["historical"]), // ~3.4 km, out of reach
];

const input = (budgetMin: number, end?: { lat: number; lng: number }) => ({
  places: PLACES,
  origin: ORIGIN,
  end,
  budgetSec: budgetMin * 60,
  interests: new Set(["historical"]),
});

describe("toSegment", () => {
  it("measures the distance to the closest point and how far along it is", () => {
    const a = { lat: 52.23, lng: 21.0 };
    const b = { lat: 52.23, lng: 21.002 };
    const { distanceM, t } = toSegment({ lat: 52.2301, lng: 21.001 }, a, b);
    expect(distanceM).toBeCloseTo(11.1, 0);
    expect(t).toBeCloseTo(0.5, 2);
  });
});

describe("planWalk", () => {
  it("walks to matching places within the time", () => {
    const walk = planWalk(input(5));
    expect(walk).not.toBeNull();
    expect(walk?.elapsedSec).toBeLessThanOrEqual(1.1 * 5 * 60);
    const ids = walk?.places.map((p) => p.placeId);
    expect(ids).toContain("east-1");
    expect(ids).toContain("east-2");
    expect(ids).not.toContain("far");
  });

  it("counts places passed on the way with their time", () => {
    const walk = planWalk(input(5));
    const east1 = walk?.places.find((p) => p.placeId === "east-1");
    const east2 = walk?.places.find((p) => p.placeId === "east-2");
    expect(east1 && east2 && east1.etaSec < east2.etaSec).toBe(true);
    expect(new Set(walk?.places.map((p) => p.placeId)).size).toBe(walk?.places.length);
  });

  it("ends at the given end point", () => {
    const walk = planWalk(input(10, ORIGIN));
    const last = walk?.waypoints[walk.waypoints.length - 1];
    expect(last && haversineM(last, ORIGIN)).toBe(0);
    expect(walk?.elapsedSec).toBeLessThanOrEqual(1.1 * 10 * 60);
  });

  it("returns null when even the walk to the end does not fit", () => {
    expect(planWalk(input(5, { lat: 52.23, lng: 21.05 }))).toBeNull();
  });
});
