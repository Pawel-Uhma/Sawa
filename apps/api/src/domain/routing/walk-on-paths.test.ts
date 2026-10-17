import { type LatLng, toLngLat } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { place } from "./__fixtures__/synthetic";
import type { LngLat } from "./types";
import { pickWalkOnPaths, placesAlongPath, retracedPathM } from "./walk-on-paths";
import { planWalk, planWalks, type Walk } from "./walk-tour";

const ORIGIN = { lat: 52.23, lng: 21.0 };
const interests = new Set(["historical"]);
// ~68 m per 0.001° of longitude, ~111 m per 0.001° of latitude here.
const east = (lng: number): LngLat => [lng, 52.23];

describe("placesAlongPath", () => {
  const path: LngLat[] = [east(21.0), east(21.004)];
  const span = { startSec: 100, sec: 200, legIndex: 1, walkedTo: [] };

  it("counts places right by the path, timed by their share of it", () => {
    const passed = placesAlongPath(
      [
        place("by-the-way", 21.002, 52.2301, ["historical"]), // ~11 m off, half way
        place("a-block-away", 21.002, 52.2306, ["historical"]), // ~67 m off
      ],
      path,
      span,
      { interests },
    );
    expect(passed.map((p) => p.placeId)).toEqual(["by-the-way"]);
    expect(passed[0]?.etaSec).toBeCloseTo(200, 0);
    expect(passed[0]?.legIndex).toBe(1);
  });

  it("counts a place walked to however far the path snapped from it", () => {
    const park = place("park-middle", 21.002, 52.2306, ["historical"]);
    const passed = placesAlongPath(
      [park],
      path,
      { ...span, walkedTo: [park.position] },
      {
        interests,
      },
    );
    expect(passed.map((p) => p.placeId)).toEqual(["park-middle"]);
  });
});

describe("retracedPathM", () => {
  it("is zero for a path that never goes back", () => {
    expect(retracedPathM([east(21.0), east(21.004), [21.004, 52.233]])).toBe(0);
  });

  it("counts the way back along the same street", () => {
    // ~270 m out and the same back.
    const retraced = retracedPathM([east(21.0), east(21.004), east(21.0)]);
    expect(retraced).toBeGreaterThan(200);
    expect(retraced).toBeLessThan(280);
  });
});

describe("planWalks", () => {
  const places = [
    place("east-1", 21.002, 52.23, ["historical"]),
    place("east-2", 21.004, 52.23, ["historical"]),
    place("north", 21.0, 52.232, ["historical"]),
  ];
  const input = { places, origin: ORIGIN, budgetSec: 600, interests };

  it("starts with planWalk's walk and goes through a different set of places in each", () => {
    const walks = planWalks(input, {}, 4);
    expect(walks.length).toBeGreaterThan(1);
    expect(walks[0]).toEqual(planWalk(input));
    const sets = walks.map((w) =>
      w.waypoints
        .slice(1)
        .map((p) => `${p.lat},${p.lng}`)
        .sort()
        .join("|"),
    );
    expect(new Set(sets).size).toBe(walks.length);
  });
});

describe("pickWalkOnPaths", () => {
  const byStreet = place("by-street", 21.002, 52.2301, ["historical"]);
  const target = place("target", 21.004, 52.23, ["historical"]);
  const places = [byStreet, target];
  const walk = (waypoints: LatLng[]): Walk => ({
    waypoints,
    places: [],
    elapsedSec: 300,
    score: 1,
  });
  const straight = walk([ORIGIN, target.position]);
  const input = { places, budgetSec: 400, interests };

  it("takes the walk whose real path passes more, with its places and time", () => {
    const direct = [toLngLat(ORIGIN), toLngLat(target.position)];
    // Round a railway: ~110 m north, east, back south. Misses `by-street`.
    const around: LngLat[] = [east(21.0), [21.0, 52.231], [21.004, 52.231], east(21.004)];
    const picked = pickWalkOnPaths(
      [
        { walk: straight, path: around },
        { walk: walk([ORIGIN, byStreet.position, target.position]), path: direct },
      ],
      input,
    );
    expect(picked?.places.map((p) => p.placeId).sort()).toEqual(["by-street", "target"]);
    expect(picked?.elapsedSec).toBeCloseTo(270 / 1.2, -1);
  });

  it("skips walks whose path does not fit the time, or far longer than the shortest when none does", () => {
    const short: LngLat[] = [toLngLat(ORIGIN), toLngLat(target.position)];
    // ~2.4 km round: far over 1.1 × 300 s.
    const long: LngLat[] = [east(21.0), [21.0, 52.24], [21.004, 52.24], east(21.004)];
    const picked = pickWalkOnPaths(
      [
        { walk: walk([ORIGIN, byStreet.position, target.position]), path: long },
        { walk: straight, path: short },
      ],
      { ...input, budgetSec: 250 },
    );
    expect(picked?.waypoints).toEqual(straight.waypoints);
    const none = pickWalkOnPaths([{ walk: straight, path: long }], input);
    expect(none?.waypoints).toEqual(straight.waypoints);
  });

  it("when none fits, picks the best of the walks near the shortest", () => {
    const places = [
      place("east-other", 21.002, 52.23, ["cultural"]),
      place("west-match", 20.998, 52.23, ["historical"]),
      place("north-1", 21.0, 52.231, ["historical"]),
      place("north-2", 21.0, 52.232, ["historical"]),
    ];
    const paths: LngLat[][] = [
      [east(21.0), east(21.0039)], // ~267 m, the shortest, passes only a non-match
      [east(21.0), east(20.996)], // ~274 m, 3 % longer, passes a match
      [east(21.0), [21.0, 52.2327]], // ~300 m, 12 % longer, passes two matches
    ];
    const picked = pickWalkOnPaths(
      paths.map((path, i) => ({ walk: walk([ORIGIN, { lat: 52.23 + i / 1e5, lng: 21.0 }]), path })),
      { places, budgetSec: 100, interests },
    );
    expect(picked?.places.map((p) => p.placeId)).toEqual(["west-match"]);
  });

  it("returns undefined without any path", () => {
    expect(pickWalkOnPaths([{ walk: straight }], input)).toBeUndefined();
  });
});
