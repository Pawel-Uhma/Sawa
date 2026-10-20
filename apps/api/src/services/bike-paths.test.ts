import { describe, expect, it, vi } from "vitest";
import { createBikeFriendlyPathSource } from "./bike-paths";
import type { WalkPathSource } from "./ports";

type LngLat = [number, number];
const line = (km: number): LngLat[] => [
  [21, 52.23],
  [21 + 0.0147 * km, 52.23],
];
const source = (path: LngLat[] | undefined): WalkPathSource => ({ path: vi.fn(async () => path) });
const points = [
  { lat: 52.23, lng: 21 },
  { lat: 52.23, lng: 21.05 },
];

describe("createBikeFriendlyPathSource", () => {
  it("draws the leg with the router whose path runs more on bike paths", async () => {
    const osrm = line(3);
    const valhalla = line(3.1);
    const score = vi.fn(async (p: LngLat[]) => (p === valhalla ? 0.7 : 0.3));
    const bikes = createBikeFriendlyPathSource([source(osrm), source(valhalla)], score);
    expect(await bikes.path(points)).toBe(valhalla);
  });

  it("keeps the one path a router drew, without scoring it", async () => {
    const osrm = line(3);
    const score = vi.fn(async () => 1);
    const bikes = createBikeFriendlyPathSource([source(osrm), source(undefined)], score);
    expect(await bikes.path(points)).toBe(osrm);
    expect(score).not.toHaveBeenCalled();
  });

  it("falls back to the first router when scoring fails", async () => {
    const osrm = line(3);
    const bikes = createBikeFriendlyPathSource(
      [source(osrm), source(line(3))],
      vi.fn(async () => undefined),
    );
    expect(await bikes.path(points)).toBe(osrm);
  });

  it("gives nothing when no router answers", async () => {
    const bikes = createBikeFriendlyPathSource([source(undefined)], vi.fn());
    expect(await bikes.path(points)).toBeUndefined();
  });
});
