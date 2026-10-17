import { haversineM } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { place } from "./__fixtures__/synthetic";
import { placesAlong, planWalk, retracedShare, toSegment, walkThrough } from "./walk-tour";

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

describe("placesAlong", () => {
  it("counts only places right by the walk, not ones a block away", () => {
    const segment = { from: ORIGIN, to: { lat: 52.23, lng: 21.004 }, startSec: 0, sec: 300 };
    const places = [
      place("by-the-way", 21.002, 52.2301, ["historical"]), // ~11 m north of the walk
      place("across-the-street", 21.002, 52.2303, ["historical"]), // ~33 m north
    ];
    const ids = placesAlong(places, segment, { interests: new Set(["historical"]) }).map(
      (p) => p.placeId,
    );
    expect(ids).toEqual(["by-the-way"]);
  });
});

describe("walkThrough", () => {
  const to = { lat: 52.23, lng: 21.008 }; // ~550 m east
  const scoring = { interests: new Set(["historical"]) };

  it("bends the walk to pass right by a place near it", () => {
    const near = place("near", 21.004, 52.2304, ["historical"]); // ~45 m north
    const walk = walkThrough([near], ORIGIN, to, 1, scoring);
    expect(walk.waypoints).toEqual([ORIGIN, near.position, to]);
    expect(walk.places.map((p) => p.placeId)).toEqual(["near"]);
    expect(walk.sec).toBeGreaterThan(haversineM(ORIGIN, to));
    expect(walk.sec).toBeLessThan(1.2 * haversineM(ORIGIN, to));
  });

  it("keeps the straight way when the place is too far off it", () => {
    const off = place("off", 21.004, 52.2315, ["historical"]); // ~170 m north
    const walk = walkThrough([off], ORIGIN, to, 1, scoring);
    expect(walk.waypoints).toEqual([ORIGIN, to]);
    expect(walk.places).toEqual([]);
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

describe("walking back the same way", () => {
  const east = { lat: 52.23, lng: 21.008 };

  it("measures how much of a segment goes along the walk so far", () => {
    expect(retracedShare([ORIGIN, east], east, ORIGIN)).toBeGreaterThan(0.8);
    expect(retracedShare([ORIGIN, east], east, { lat: 52.235, lng: 21.008 })).toBe(0);
  });

  // ~550 m east and back fits 20 min; the detour past a minor place ~180 m north takes longer.
  const loop = {
    places: [
      place("east", 21.008, 52.23, ["historical"]),
      place("detour", 21.004, 52.2316, ["cultural"], 0.1),
    ],
    origin: ORIGIN,
    end: ORIGIN,
    budgetSec: 20 * 60,
    interests: new Set(["historical"]),
  };

  it("goes out and back when nothing penalises it", () => {
    const walk = planWalk(loop, { backtrackPenalty: 0 });
    expect(walk?.waypoints).toHaveLength(3);
  });

  it("comes back another way when one fits the time", () => {
    const walk = planWalk(loop);
    expect(walk?.waypoints.map((p) => p.lat)).toEqual([52.23, 52.2316, 52.23, 52.23]);
    expect(walk?.elapsedSec).toBeLessThanOrEqual(1.1 * 20 * 60);
  });
});
