import { describe, expect, it } from "vitest";
import { bikeInfraShare, pathLengthM, pickBikePath } from "./bike-friendly";

describe("bikeInfraShare", () => {
  it("counts bike paths, shared paths and bike lanes, not sidewalks or plain roads", () => {
    const share = bikeInfraShare([
      { length: 1, use: "cycleway" },
      { length: 1, use: "road", cycle_lane: "dedicated" },
      { length: 1, use: "path" },
      { length: 1, use: "footway" },
      { length: 1, use: "road", cycle_lane: "none" },
    ]);
    expect(share).toBeCloseTo(0.6);
  });

  it("is 0 without edges", () => {
    expect(bikeInfraShare([])).toBe(0);
  });
});

describe("pickBikePath", () => {
  // Straight lines east of Warsaw centre: 1 km ≈ 0.0147° of longitude at 52.23°N
  const line = (km: number): [number, number][] => [
    [21, 52.23],
    [21 + 0.0147 * km, 52.23],
  ];

  it("takes the path with more bike infrastructure when it is not much longer", () => {
    const osrm = line(3);
    const valhalla = line(3.1);
    expect(
      pickBikePath([
        { path: osrm, share: 0.35 },
        { path: valhalla, share: 0.68 },
      ]),
    ).toBe(valhalla);
  });

  it("takes a friendlier detour of 20%, but not one over 30% longer", () => {
    expect(
      pickBikePath([
        { path: line(3), share: 0.4 },
        { path: line(3.6), share: 0.9 },
      ]),
    ).toEqual(line(3.6));
    const osrm = line(3);
    const valhalla = line(4);
    expect(
      pickBikePath([
        { path: osrm, share: 0.4 },
        { path: valhalla, share: 0.9 },
      ]),
    ).toBe(osrm);
  });

  it("prefers the first router on a tie and when scoring failed", () => {
    const osrm = line(3);
    const valhalla = line(3);
    expect(
      pickBikePath([
        { path: osrm, share: undefined },
        { path: valhalla, share: undefined },
      ]),
    ).toBe(osrm);
  });

  it("measures path length in metres", () => {
    expect(pathLengthM(line(2))).toBeGreaterThan(1900);
    expect(pathLengthM(line(2))).toBeLessThan(2100);
  });

  it("returns null without candidates", () => {
    expect(pickBikePath([])).toBeNull();
  });
});
