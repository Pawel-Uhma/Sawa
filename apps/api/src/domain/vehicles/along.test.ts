import { describe, expect, it } from "vitest";
import { GEOMETRY, NOW_MS, tram } from "./__fixtures__/line";
import { projectNear, toPatternGeometry, vehiclesOnPattern } from "./along";

describe("projectNear", () => {
  it("measures the distance along the shape", () => {
    expect(projectNear({ lat: 52.2301, lng: 21.0 }, GEOMETRY)).toBeCloseTo(0, 0);
    const end = GEOMETRY.lengthM;
    expect(projectNear({ lat: 52.23, lng: 21.05 }, GEOMETRY)).toBeCloseTo(end, 0);
  });

  it("ignores points farther than 60 m from the shape", () => {
    expect(projectNear({ lat: 52.231, lng: 21.01 }, GEOMETRY)).toBeUndefined();
  });

  it("stays on the pass nearest the previous position where the shape goes out and back", () => {
    const outAndBack = toPatternGeometry({
      ...GEOMETRY.pattern,
      lngLats: [
        [21.0, 52.23],
        [21.01, 52.23],
        [21.0, 52.23],
      ],
    });
    const half = outAndBack.lengthM / 2;
    const p = { lat: 52.23, lng: 21.002 };
    expect(projectNear(p, outAndBack, 100)).toBeLessThan(half);
    expect(projectNear(p, outAndBack, half + 500)).toBeGreaterThan(half);
  });
});

describe("vehiclesOnPattern", () => {
  it("keeps vehicles driving the pattern's direction", () => {
    const v = vehiclesOnPattern(
      [
        tram("t1", [
          [60, 100],
          [30, 300],
          [0, 500],
        ]),
      ],
      GEOMETRY,
      NOW_MS,
    );
    expect(v).toHaveLength(1);
    expect(v[0]?.standing).toBe(false);
    expect(v[0]?.along.at(-1)?.alongM).toBeCloseTo(500, 0);
  });

  it("drops vehicles of the line going the other way", () => {
    const v = vehiclesOnPattern(
      [
        tram("t1", [
          [60, 900],
          [30, 700],
          [0, 500],
        ]),
      ],
      GEOMETRY,
      NOW_MS,
    );
    expect(v).toEqual([]);
  });

  it("drops other lines, vehicles off the shape and silent ones", () => {
    const v = vehiclesOnPattern(
      [
        tram(
          "other",
          [
            [30, 100],
            [0, 300],
          ],
          0,
          "10",
        ),
        tram(
          "off",
          [
            [30, 100],
            [0, 300],
          ],
          200,
        ),
        tram("silent", [
          [400, 100],
          [200, 300],
        ]),
      ],
      GEOMETRY,
      NOW_MS,
    );
    expect(v).toEqual([]);
  });

  it("needs two reports to tell the direction", () => {
    expect(vehiclesOnPattern([tram("t1", [[0, 500]])], GEOMETRY, NOW_MS)).toEqual([]);
  });

  it("marks a vehicle that hardly moved as standing and removes GPS jitter", () => {
    const v = vehiclesOnPattern(
      [
        tram("t1", [
          [40, 500],
          [20, 490],
          [0, 510],
        ]),
      ],
      GEOMETRY,
      NOW_MS,
    );
    expect(v[0]?.standing).toBe(true);
    expect(v[0]?.along.map((s) => Math.round(s.alongM))).toEqual([500, 500, 510]);
  });

  it("drops a vehicle standing at the last stop", () => {
    const end = GEOMETRY.lengthM;
    expect(
      vehiclesOnPattern(
        [
          tram("t1", [
            [40, end],
            [0, end],
          ]),
        ],
        GEOMETRY,
        NOW_MS,
      ),
    ).toEqual([]);
  });

  it("starts the history at the terminus turn", () => {
    const v = vehiclesOnPattern(
      [
        tram("t1", [
          [600, 800],
          [500, 300],
          [400, 0],
          [30, 0],
          [0, 200],
        ]),
      ],
      GEOMETRY,
      NOW_MS,
    );
    expect(v[0]?.along.map((s) => Math.round(s.alongM))).toEqual([0, 0, 200]);
  });
});

describe("vehiclesOnPattern with siblings", () => {
  // A variant of line 9 going north, crossing 9:1 at lng 21.02.
  const north = toPatternGeometry({
    ...GEOMETRY.pattern,
    id: "9:3",
    lngLats: [
      [21.02, 52.22],
      [21.02, 52.24],
    ],
  });
  const crossing = {
    ...tram("x", []),
    samples: [-40, 0, 40].map((offM, i) => ({
      atMs: NOW_MS - (40 - i * 20) * 1000,
      position: { lat: 52.23 + offM / 111_320, lng: 21.02 },
    })),
  };

  it("drops a vehicle standing here that drives forward on another pattern of the line", () => {
    expect(vehiclesOnPattern([crossing], GEOMETRY, NOW_MS)[0]?.standing).toBe(true);
    expect(vehiclesOnPattern([crossing], GEOMETRY, NOW_MS, [GEOMETRY, north])).toEqual([]);
  });
});
