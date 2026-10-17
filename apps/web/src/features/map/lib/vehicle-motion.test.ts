import type { LiveVehicle } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import {
  applyVehicles,
  MOTION_TIMING,
  REDUCED_MOTION_TIMING,
  type VehicleMotionState,
  vehicleCollection,
} from "./vehicle-motion";

const T0 = Date.parse("2026-10-17T16:00:00Z");

function vehicle(id: string, track: LiveVehicle["track"], role: LiveVehicle["role"] = "ride") {
  return {
    id,
    line: "136",
    mode: "bus",
    brigade: "1",
    role,
    position: { lat: track[0][1], lng: track[0][0] },
    reportedAt: new Date(T0).toISOString(),
    speedSource: "leader",
    track,
  } satisfies LiveVehicle;
}

// Moves 0.01° east in 10 s, starting at T0.
const EAST = [
  [20, 52, T0],
  [20.01, 52, T0 + 10_000],
] as LiveVehicle["track"];

const EAST_LATER = [
  [20.02, 52, T0 + 10_000],
  [20.03, 52, T0 + 20_000],
] as LiveVehicle["track"];

const lastFeature = (state: VehicleMotionState, now: number, timing = MOTION_TIMING) =>
  vehicleCollection(state, now, timing, false).features;

describe("applyVehicles", () => {
  it("draws a new vehicle on its track and fades it in", () => {
    const state = applyVehicles(new Map(), [vehicle("bus-1", EAST)], T0, MOTION_TIMING);
    const [atStart] = lastFeature(state, T0);
    expect(atStart?.geometry.coordinates).toEqual([20, 52]);
    expect(atStart?.properties.opacity).toBe(0);
    const [halfway] = lastFeature(state, T0 + 200);
    expect(halfway?.properties.opacity).toBeCloseTo(0.5);
  });

  it("glides from the drawn spot to a new track instead of jumping", () => {
    const first = applyVehicles(new Map(), [vehicle("bus-1", EAST)], T0, MOTION_TIMING);
    const at = T0 + 5_000;
    const drawnBefore = lastFeature(first, at)[0]?.geometry.coordinates;
    const second = applyVehicles(first, [vehicle("bus-1", EAST_LATER)], at, MOTION_TIMING);
    // Right after the new response the vehicle is still where it was drawn.
    const justAfter = lastFeature(second, at)[0]?.geometry.coordinates;
    expect(justAfter?.[0]).toBeCloseTo(drawnBefore?.[0] ?? 0, 6);
    // After the blend it sits on the new track (which starts at 20.02 until its first point).
    const settled = lastFeature(second, at + MOTION_TIMING.blendMs)[0]?.geometry.coordinates;
    expect(settled?.[0]).toBeCloseTo(20.02, 6);
  });

  it("does not glide when motion is reduced", () => {
    const first = applyVehicles(new Map(), [vehicle("bus-1", EAST)], T0, REDUCED_MOTION_TIMING);
    const second = applyVehicles(
      first,
      [vehicle("bus-1", EAST_LATER)],
      T0 + 5_000,
      REDUCED_MOTION_TIMING,
    );
    const [feature] = lastFeature(second, T0 + 5_000, REDUCED_MOTION_TIMING);
    expect(feature?.geometry.coordinates[0]).toBeCloseTo(20.02, 6);
    expect(feature?.properties.opacity).toBe(1);
  });

  it("fades out a vehicle that left the data, then drops it", () => {
    const first = applyVehicles(new Map(), [vehicle("bus-1", EAST)], T0, MOTION_TIMING);
    const gone = applyVehicles(first, [], T0 + 5_000, MOTION_TIMING);
    expect(lastFeature(gone, T0 + 5_000)[0]?.properties.opacity).toBe(1);
    expect(lastFeature(gone, T0 + 5_200)[0]?.properties.opacity).toBeCloseTo(0.5);
    const done = applyVehicles(gone, [], T0 + 5_000 + MOTION_TIMING.fadeMs, MOTION_TIMING);
    expect(done.size).toBe(0);
  });
});

describe("vehicleCollection", () => {
  it("dims vehicles that are not the rider's and stale data", () => {
    const state = applyVehicles(
      new Map(),
      [vehicle("bus-1", EAST), vehicle("bus-2", EAST, "ahead")],
      T0,
      REDUCED_MOTION_TIMING,
    );
    const [ride, ahead] = vehicleCollection(state, T0, REDUCED_MOTION_TIMING, false).features;
    expect(ride?.properties.opacity).toBe(1);
    expect(ahead?.properties.opacity).toBe(0.6);
    const stale = vehicleCollection(state, T0, REDUCED_MOTION_TIMING, true).features[0];
    expect(stale?.properties.opacity).toBe(0.5);
  });

  it("points the icon along the direction of travel", () => {
    const state = applyVehicles(new Map(), [vehicle("bus-1", EAST)], T0, REDUCED_MOTION_TIMING);
    const [feature] = vehicleCollection(state, T0 + 5_000, REDUCED_MOTION_TIMING, false).features;
    // Driving east is a bearing of about 90°.
    expect(feature?.properties.bearingDeg).toBeCloseTo(90, 0);
  });
});
