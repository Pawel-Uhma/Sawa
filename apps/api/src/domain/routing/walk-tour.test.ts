import { haversineM, type LatLng } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { place } from "./__fixtures__/synthetic";
import {
  isLoop,
  placesAlong,
  planBeamWalk,
  planSquareLoop,
  planSquareLoops,
  planWalk,
  polylineM,
  resizeLoop,
  retracedShare,
  squareness,
  toSegment,
  turnBackM,
  walkThrough,
} from "./walk-tour";

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

  it("counts a building farther off: its point is the middle, the walker passes the facade", () => {
    const segment = { from: ORIGIN, to: { lat: 52.23, lng: 21.004 }, startSec: 0, sec: 300 };
    const places = [
      { ...place("palace", 21.002, 52.2304, ["historical"]), kind: "building" as const }, // ~45 m
      { ...place("plaque", 21.002, 52.2304, ["historical"]), kind: "plaque" as const },
      { ...place("far-church", 21.002, 52.2306, ["historical"]), kind: "church" as const }, // ~67 m
    ];
    const ids = placesAlong(places, segment, { interests: new Set(["historical"]) }).map(
      (p) => p.placeId,
    );
    expect(ids).toEqual(["palace"]);
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
    const walk = planBeamWalk(loop, { backtrackPenalty: 0 });
    expect(walk?.waypoints).toHaveLength(3);
  });

  it("comes back another way when one fits the time", () => {
    const walk = planBeamWalk(loop);
    expect(walk?.waypoints.map((p) => p.lat)).toEqual([52.23, 52.2316, 52.23, 52.23]);
    expect(walk?.elapsedSec).toBeLessThanOrEqual(1.1 * 20 * 60);
  });
});

describe("turning back along the street just walked", () => {
  // ~680 m east of the origin
  const east = { lat: 52.23, lng: 21.01 };

  it("counts a sharp turn back as walking back, up to the shorter arm", () => {
    const back = turnBackM(ORIGIN, east, { lat: 52.2302, lng: 21.0 });
    expect(back).toBeCloseTo(haversineM(east, ORIGIN), -1);
    expect(turnBackM(ORIGIN, east, { lat: 52.2301, lng: 21.008 })).toBeCloseTo(
      haversineM(east, { lat: 52.2301, lng: 21.008 }),
      -1,
    );
  });

  it("does not count a turn to another street", () => {
    expect(turnBackM(ORIGIN, east, { lat: 52.235, lng: 21.01 })).toBe(0);
  });

  it("credits places on the way out, not on the same street walked back", () => {
    // ~950 m east and back at ~6° to a point ~100 m north of the origin: the places ~50–70 m
    // north of the straight line out lie by the straight line back, but that way back is the
    // same street on the map, so the walk only gets them by passing them on the way out.
    const far = place("far", 21.014, 52.23, ["historical"]);
    const walk = planWalk({
      places: [
        far,
        place("mid-1", 21.007, 52.23045, ["historical"]),
        place("mid-2", 21.0042, 52.23063, ["historical"]),
      ],
      origin: ORIGIN,
      end: { lat: 52.2309, lng: 21.0 },
      budgetSec: 40 * 60,
      interests: new Set(["historical"]),
    });
    const eta = new Map(walk?.places.map((p) => [p.placeId, p.etaSec]));
    expect(eta.get("far")).toBeDefined();
    for (const id of ["mid-1", "mid-2"]) {
      if (eta.has(id)) expect(eta.get(id)).toBeLessThan(eta.get("far") as number);
    }
  });
});

describe("isLoop", () => {
  it("is a loop only when the walk ends at the start", () => {
    expect(isLoop(ORIGIN, ORIGIN)).toBe(true);
    expect(isLoop(ORIGIN, { lat: 52.2302, lng: 21.0 })).toBe(true); // ~22 m
    expect(isLoop(ORIGIN, { lat: 52.235, lng: 21.0 })).toBe(false);
    expect(isLoop(ORIGIN, undefined)).toBe(false);
  });
});

describe("squareness", () => {
  const ll = (lng: number, lat: number) => ({ lat, lng });

  it("is 1 for a square, low for a lollipop and zero for out and back", () => {
    const square = [ORIGIN, ll(21.003, 52.23), ll(21.003, 52.2318), ll(21.0, 52.2318)];
    const lollipop = [ORIGIN, ll(21.006, 52.23), ll(21.006, 52.2306), ll(21.0, 52.2306)];
    expect(squareness(square)).toBeCloseTo(1, 1);
    expect(squareness(lollipop)).toBeLessThan(0.6);
    expect(squareness([ORIGIN, ll(21.004, 52.23), ORIGIN])).toBe(0);
  });
});

describe("a loop walks round a square of places", () => {
  // 24 min at 0.92 m/s: a square of ~330 m sides, east, then north-east, then north of the origin.
  const corners = [
    place("c1", 21.005, 52.2301, ["historical"]),
    place("c2", 21.0047, 52.2331, ["historical"]),
    place("c3", 20.9998, 52.2328, ["historical"]),
  ];
  const onSide = place("side", 21.0049, 52.2315, ["historical"]);
  const west = place("west", 20.996, 52.2315, ["historical"]);
  const loop = (places = [...corners, onSide, west]) => ({
    places,
    origin: ORIGIN,
    end: ORIGIN,
    budgetSec: 24 * 60,
    interests: new Set(["historical"]),
  });

  it("walks through places near the three corners and back to the start", () => {
    const walk = planSquareLoop(loop());
    expect(walk.waypoints).toEqual([ORIGIN, ...corners.map((c) => c.position), ORIGIN]);
    expect(Math.abs(walk.elapsedSec - 24 * 60)).toBeLessThanOrEqual(0.1 * 24 * 60);
  });

  it("collects the places by its sides in walking order, not those off it", () => {
    const ids = planSquareLoop(loop()).places.map((p) => p.placeId);
    expect(ids).toEqual(["c1", "side", "c2", "c3"]);
  });

  it("walks round the bare square that fits the time when no place stands at a corner", () => {
    const walk = planSquareLoop(loop([west]));
    const [o, c1, c2] = walk.corners as [LatLng, LatLng, LatLng];
    expect(walk.corners).toHaveLength(5);
    expect(haversineM(o, c1)).toBeCloseTo((24 * 60 * 1.2) / (4 * 1.3), -1);
    expect(haversineM(o, c2)).toBeCloseTo(haversineM(o, c1) * Math.SQRT2, -1);
    expect(walk.elapsedSec).toBeCloseTo(24 * 60, -1);
  });

  it("is what planWalk plans for a loop, and walks to a destination stay as they were", () => {
    expect(planWalk(loop())).toEqual(planSquareLoop(loop()));
    const toDestination = { ...loop(), end: { lat: 52.233, lng: 21.006 } };
    expect(planWalk(toDestination)).toEqual(planBeamWalk(toDestination));
  });

  it("bends a side through an interesting place near it, not only those right by it", () => {
    // ~40 m off the side from the corner east to the one north-east.
    const offSide = place("off-side", 21.0055, 52.2316, ["historical"]);
    const walk = planSquareLoop(loop([...corners, offSide]));
    expect(walk.waypoints).toContainEqual(offSide.position);
    expect(walk.places.map((p) => p.placeId)).toEqual(["c1", "off-side", "c2", "c3"]);
    expect(Math.abs(walk.elapsedSec - 24 * 60)).toBeLessThanOrEqual(0.1 * 24 * 60);
  });

  it("shrinks a loop by moving its bare corners, keeping the places at its corners", () => {
    const walk = planSquareLoop(loop([corners[1] as (typeof corners)[number]]));
    const length = polylineM(walk.corners ?? []);
    const smaller = resizeLoop(loop([corners[1] as (typeof corners)[number]]), walk, 0.9 * length);
    expect(smaller && polylineM(smaller.corners ?? [])).toBeCloseTo(0.9 * length, -1);
    expect(smaller?.corners?.[2]).toEqual(walk.corners?.[2]);
    expect(resizeLoop(loop(), planSquareLoop(loop()), 1000)).toBeUndefined();
    expect(resizeLoop(loop([west]), planSquareLoop(loop([west])), 100)).toBeUndefined();
  });

  it("does not shrink a loop into a narrow V back along the way out", () => {
    // Places ~300 m east and north; the bare corner just outside the line between them, so
    // pulling it in makes a dart back towards the start.
    const east = place("east", 21.0044, 52.23, ["historical"]);
    const north = place("north", 21.0, 52.2327, ["historical"]);
    const bare = { lat: 52.23 + 0.48 * 0.0027, lng: 21.0 + 0.6 * 0.0044 };
    const corners = [ORIGIN, east.position, bare, north.position, ORIGIN];
    const dart = { waypoints: corners, corners, places: [], elapsedSec: 0, score: 0 };
    const input = { ...loop([east, north]) };
    expect(squareness(corners.slice(0, -1))).toBeGreaterThan(0.7);
    expect(resizeLoop(input, dart, 0.97 * polylineM(corners))).toBeUndefined();
    expect(resizeLoop(input, dart, 1.05 * polylineM(corners))).toBeDefined();
  });

  it("offers different loops, the best first", () => {
    const loops = planSquareLoops(loop(), {}, 3);
    expect(loops[0]).toEqual(planSquareLoop(loop()));
    expect(loops).toHaveLength(3);
    for (let i = 1; i < loops.length; i++) {
      const differs = (loops[i]?.corners ?? []).some(
        (c, k) => haversineM(c, (loops[0]?.corners ?? [])[k] as LatLng) > 0.3 * 330,
      );
      expect(differs).toBe(true);
    }
  });

  it("stays at the start when there is no time for a square", () => {
    const walk = planSquareLoop({ ...loop(), budgetSec: 30 });
    expect(walk.waypoints).toEqual([ORIGIN, ORIGIN]);
    expect(walk.places).toEqual([]);
  });
});
