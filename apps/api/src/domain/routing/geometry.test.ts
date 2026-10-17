import { describe, expect, it } from "vitest";
import {
  bboxAround,
  cumulativeDistancesM,
  isInBbox,
  projectOnPolyline,
  slicePolyline,
} from "./geometry";
import type { LngLat } from "./types";

// ~680 m east-west segment
const LINE: LngLat[] = [
  [21.0, 52.23],
  [21.005, 52.23],
  [21.01, 52.23],
];
const CUM = cumulativeDistancesM(LINE);

describe("cumulativeDistancesM", () => {
  it("starts at 0 and grows by segment length", () => {
    expect(CUM[0]).toBe(0);
    expect(CUM[2]).toBeCloseTo(2 * (CUM[1] as number), 3);
    expect(CUM[2]).toBeGreaterThan(670);
    expect(CUM[2]).toBeLessThan(690);
  });
});

describe("projectOnPolyline", () => {
  it("measures the perpendicular distance and the position along the line", () => {
    const { distanceM, alongM } = projectOnPolyline({ lat: 52.2309, lng: 21.0075 }, LINE, CUM);
    expect(distanceM).toBeCloseTo(100, 0);
    expect(alongM).toBeCloseTo((CUM[2] as number) * 0.75, 0);
  });

  it("clamps to the end point beyond the line", () => {
    const { alongM } = projectOnPolyline({ lat: 52.23, lng: 21.02 }, LINE, CUM);
    expect(alongM).toBeCloseTo(CUM[2] as number, 3);
  });
});

describe("slicePolyline", () => {
  it("cuts with interpolated end points and keeps inner vertices", () => {
    const half = (CUM[1] as number) / 2;
    const slice = slicePolyline(LINE, CUM, half, CUM[2] as number);
    expect(slice).toHaveLength(3);
    expect(slice[0]?.[0]).toBeCloseTo(21.0025, 6);
    expect(slice[1]).toEqual([21.005, 52.23]);
    expect(slice[2]?.[0]).toBeCloseTo(21.01, 6);
  });
});

describe("bboxAround / isInBbox", () => {
  it("pads the box by the given distance", () => {
    const box = bboxAround(LINE, 150);
    expect(isInBbox({ lat: 52.2312, lng: 21.005 }, box)).toBe(true);
    expect(isInBbox({ lat: 52.2325, lng: 21.005 }, box)).toBe(false);
  });
});
