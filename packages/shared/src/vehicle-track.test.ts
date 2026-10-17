import { describe, expect, it } from "vitest";
import type { VehicleTrackPoint } from "./schemas/vehicles";
import { positionOnTrack } from "./vehicle-track";

const track: VehicleTrackPoint[] = [
  [21.0, 52.0, 1_000],
  [21.0, 52.01, 11_000],
  [21.0, 52.01, 21_000],
  [21.01, 52.01, 31_000],
];

describe("positionOnTrack", () => {
  it("interpolates between points by time", () => {
    const p = positionOnTrack(track, 6_000);
    expect(p?.lngLat[0]).toBeCloseTo(21.0);
    expect(p?.lngLat[1]).toBeCloseTo(52.005);
    expect(p?.bearingDeg).toBeCloseTo(0);
  });

  it("clamps to the ends of the track", () => {
    expect(positionOnTrack(track, 0)?.lngLat).toEqual([21.0, 52.0]);
    expect(positionOnTrack(track, 99_000)?.lngLat).toEqual([21.01, 52.01]);
  });

  it("keeps the last heading while the vehicle stands", () => {
    expect(positionOnTrack(track, 15_000)?.bearingDeg).toBeCloseTo(0);
    expect(positionOnTrack(track, 25_000)?.bearingDeg).toBeCloseTo(90, 0);
  });

  it("returns undefined for an empty track", () => {
    expect(positionOnTrack([], 0)).toBeUndefined();
  });
});
