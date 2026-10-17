import { describe, expect, it } from "vitest";
import { GEOMETRY, STOP_M } from "./__fixtures__/line";
import { toPatternGeometry } from "./along";
import { knotsToTrack, pointAtAlong } from "./track";

describe("pointAtAlong", () => {
  it("interpolates on the shape and clamps to its ends", () => {
    expect(pointAtAlong(GEOMETRY, STOP_M / 2)[0]).toBeCloseTo(21.0025, 5);
    expect(pointAtAlong(GEOMETRY, -10)).toEqual([21, 52.23]);
    expect(pointAtAlong(GEOMETRY, 1e9)[0]).toBeCloseTo(21.05, 6);
  });
});

describe("knotsToTrack", () => {
  const corner = toPatternGeometry({
    ...GEOMETRY.pattern,
    lngLats: [
      [21.0, 52.23],
      [21.01, 52.23],
      [21.01, 52.24],
    ],
  });
  const mid = corner.cumDistM[1] as number;

  it("follows the corners of the shape with interpolated times", () => {
    const track = knotsToTrack(
      [
        { atMs: 0, alongM: 0 },
        { atMs: 100_000, alongM: 2 * mid },
      ],
      corner,
      200_000,
    );
    expect(track.map((p) => p[2])).toEqual([0, 50_000, 100_000, 200_000]);
    expect(track[1]?.slice(0, 2)).toEqual([21.01, 52.23]);
  });

  it("cuts the track at endMs", () => {
    const track = knotsToTrack(
      [
        { atMs: 0, alongM: 0 },
        { atMs: 100_000, alongM: mid },
      ],
      corner,
      50_000,
    );
    expect(track.at(-1)?.[2]).toBe(50_000);
    expect(track.at(-1)?.[0]).toBeCloseTo(21.005, 5);
  });
});
