import { describe, expect, it } from "vitest";
import {
  isApproaching,
  NEXT_STORY_M,
  OFF_ROUTE_M,
  pathLengthM,
  pathOf,
  pointAtM,
  projectOnPath,
  routeAlongOf,
  simulatedAlongM,
  userAlongM,
} from "./route-progress";

const LAT = 52.23;
/** Metry na stopień długości przy tej szerokości. */
const M_PER_LNG = 111_320 * Math.cos((LAT * Math.PI) / 180);
const east = (m: number) => 21 + m / M_PER_LNG;
const at = (m: number, northM = 0) => ({ lat: LAT + northM / 111_320, lng: east(m) });

// Prosta trasa 3 km na wschód, dwa odcinki stykające się w połowie.
const legs = [
  { lngLats: [[east(0), LAT] as const, [east(1500), LAT] as const] },
  { lngLats: [[east(1500), LAT] as const, [east(3000), LAT] as const] },
];

describe("pathOf and pointAtM", () => {
  it("measures the line and finds a point on it", () => {
    const path = pathOf(legs.flatMap((l) => l.lngLats));
    expect(path.points).toHaveLength(3);
    expect(pathLengthM(path)).toBeCloseTo(3000, -2);
    expect(pointAtM(path, 750)?.lng).toBeCloseTo(east(750), 3);
    expect(pointAtM(path, 99_999)?.lng).toBeCloseTo(east(3000), 3);
    expect(pointAtM(pathOf([]), 10)).toBeNull();
  });
});

describe("projectOnPath", () => {
  const path = pathOf(legs.flatMap((l) => l.lngLats));

  it("gives how far along the line a point is and how far off it", () => {
    const hit = projectOnPath(path, at(1000, 80));
    expect(hit?.alongM).toBeCloseTo(1000, -2);
    expect(hit?.offM).toBeCloseTo(80, 0);
  });

  it("searches only the given stretch of the line", () => {
    expect(projectOnPath(path, at(2500), 0, 1000)?.alongM).toBeCloseTo(1000, -2);
  });
});

describe("routeAlongOf", () => {
  it("places stops on their leg, in order, also on a loop back to the start", () => {
    const loop = [...legs, { lngLats: [[east(3000), LAT] as const, [east(0), LAT] as const] }];
    const { stopsM } = routeAlongOf(loop, [
      { position: at(200, 100), legIndex: 0 },
      { position: at(2000, -60), legIndex: 1 },
      // Back near the start: on the way back, not at the beginning.
      { position: at(200, 100), legIndex: 2 },
    ]);
    expect(stopsM[0]).toBeCloseTo(200, -2);
    expect(stopsM[1]).toBeCloseTo(2000, -2);
    expect(stopsM[2]).toBeCloseTo(5800, -2);
  });
});

describe("userAlongM and isApproaching", () => {
  const along = routeAlongOf(legs, [
    { position: at(500), legIndex: 0 },
    { position: at(1500), legIndex: 1 },
    { position: at(2500), legIndex: 1 },
  ]);

  it("starts the next story within the distance threshold, not before", () => {
    const stopM = along.stopsM[1] as number;
    expect(isApproaching(stopM - NEXT_STORY_M + 10, stopM)).toBe(true);
    expect(isApproaching(stopM - NEXT_STORY_M - 10, stopM)).toBe(false);
    expect(isApproaching(stopM + 300, stopM)).toBe(true);
  });

  it("finds the phone on the route, and ignores it far off the line", () => {
    expect(userAlongM(along, at(1350, 40), 0, 2)).toBeCloseTo(1350, -2);
    expect(userAlongM(along, at(1350, OFF_ROUTE_M + 50), 0, 2)).toBeNull();
  });
});

describe("simulatedAlongM", () => {
  const along = routeAlongOf(legs, [
    { position: at(1000), legIndex: 0 },
    { position: at(2000), legIndex: 1 },
  ]);
  const stops = [
    { etaMin: 2, etaSec: 100 },
    { etaMin: 5, etaSec: 300 },
  ];

  it("moves along the line with the ride clock, between the planner's places", () => {
    expect(simulatedAlongM(along, stops, 0, 400)).toBe(0);
    expect(simulatedAlongM(along, stops, 50, 400)).toBeCloseTo(500, -2);
    expect(simulatedAlongM(along, stops, 200, 400)).toBeCloseTo(1500, -2);
    expect(simulatedAlongM(along, stops, 350, 400)).toBeCloseTo(2500, -2);
    expect(simulatedAlongM(along, stops, 9999, 400)).toBeCloseTo(3000, -2);
  });
});
