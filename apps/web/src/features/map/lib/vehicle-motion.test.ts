import type { LiveVehicle } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import {
  applyVehicles,
  MOTION_TIMING,
  REDUCED_MOTION_TIMING,
  TRACK_SPEED_SHARE,
  type VehicleMotionState,
  type VehicleOnLeg,
  vehicleCollection,
} from "./vehicle-motion";

const T0 = Date.parse("2026-10-17T16:00:00Z");
/** Metres per degree of longitude at 52° N. */
const M_PER_DEG = 111_320 * Math.cos((52 * Math.PI) / 180);
const FRAME_MS = 16;

function vehicle(
  id: string,
  track: LiveVehicle["track"],
  role: LiveVehicle["role"] = "ride",
): VehicleOnLeg {
  const live = {
    id,
    line: "136",
    mode: "bus",
    brigade: "1",
    role,
    position: { lat: track[0][1], lng: track[0][0] },
    reportedAt: new Date(track[0][2]).toISOString(),
    speedSource: "leader",
    track,
  } satisfies LiveVehicle;
  return { legIndex: 1, vehicle: live };
}

/** Drives east 0.001° (about 69 m) every 10 s from `lng` at `atMs`, for a minute. */
function east(lng: number, atMs: number): LiveVehicle["track"] {
  return Array.from({ length: 7 }, (_, i) => [lng + i * 0.001, 52, atMs + i * 10_000]);
}

const lngAt = (state: VehicleMotionState, now: number, timing = MOTION_TIMING) =>
  vehicleCollection(state, now, timing, false).features[0]?.geometry.coordinates[0] ?? Number.NaN;

/** Draws frames from `from` to `to` and returns the drawn longitudes. */
function frames(state: VehicleMotionState, from: number, to: number): number[] {
  const out: number[] = [];
  for (let now = from; now <= to; now += FRAME_MS) out.push(lngAt(state, now));
  return out;
}

describe("applyVehicles", () => {
  it("draws a new vehicle on its track and fades it in", () => {
    const state = applyVehicles(new Map(), [vehicle("bus-1", east(20, T0))], T0, MOTION_TIMING);
    const [atStart] = vehicleCollection(state, T0, MOTION_TIMING, false).features;
    expect(atStart?.geometry.coordinates).toEqual([20, 52]);
    expect(atStart?.properties.opacity).toBe(0);
    const [halfway] = vehicleCollection(state, T0 + 200, MOTION_TIMING, false).features;
    expect(halfway?.properties.opacity).toBeCloseTo(0.5);
  });

  it("plays the track slower than predicted", () => {
    const state = applyVehicles(new Map(), [vehicle("bus-1", east(20, T0))], T0, MOTION_TIMING);
    frames(state, T0, T0 + 10_000);
    expect(lngAt(state, T0 + 10_000)).toBeCloseTo(20 + 0.001 * TRACK_SPEED_SHARE, 6);
  });

  it("never goes back when the new track is behind the drawn spot", () => {
    const first = applyVehicles(new Map(), [vehicle("bus-1", east(20, T0))], T0, MOTION_TIMING);
    const at = T0 + 8_000;
    const drawn = frames(first, T0, at);
    // ZTM reports the bus 25 m behind where it is drawn.
    const behind = (drawn.at(-1) ?? 0) - 25 / M_PER_DEG;
    const second = applyVehicles(first, [vehicle("bus-1", east(behind, at))], at, MOTION_TIMING);
    const after = frames(second, at, at + 20_000);
    expect(after[0]).toBeCloseTo(drawn.at(-1) ?? 0, 6);
    for (let i = 1; i < after.length; i++) {
      expect(after[i]).toBeGreaterThanOrEqual(after[i - 1] as number);
    }
    // In the end it is back on the (slowed) prediction.
    const target = behind + 0.001 * ((20_000 * TRACK_SPEED_SHARE) / 10_000);
    expect(after.at(-1)).toBeCloseTo(target, 5);
  });

  it("catches up with a new track ahead without jumping", () => {
    const first = applyVehicles(new Map(), [vehicle("bus-1", east(20, T0))], T0, MOTION_TIMING);
    const at = T0 + 8_000;
    const drawn = frames(first, T0, at);
    // ZTM reports the bus 40 m ahead of where it is drawn.
    const ahead = (drawn.at(-1) ?? 0) + 40 / M_PER_DEG;
    const second = applyVehicles(first, [vehicle("bus-1", east(ahead, at))], at, MOTION_TIMING);
    const after = frames(second, at, at + 20_000);
    expect(after[0]).toBeCloseTo(drawn.at(-1) ?? 0, 6);
    // Per frame no faster than its own speed plus the 12 m/s pull.
    const maxStepM = ((6.9 * TRACK_SPEED_SHARE + 12) * FRAME_MS) / 1000;
    for (let i = 1; i < after.length; i++) {
      const stepM = ((after[i] as number) - (after[i - 1] as number)) * M_PER_DEG;
      expect(stepM).toBeGreaterThanOrEqual(0);
      expect(stepM).toBeLessThanOrEqual(maxStepM);
    }
    const target = ahead + 0.001 * ((20_000 * TRACK_SPEED_SHARE) / 10_000);
    expect(after.at(-1)).toBeCloseTo(target, 5);
  });

  it("places a vehicle on a new track far from the drawn spot without a glide", () => {
    const first = applyVehicles(new Map(), [vehicle("bus-1", east(20, T0))], T0, MOTION_TIMING);
    lngAt(first, T0 + 5_000);
    const elsewhere = east(20.05, T0 + 5_000).map(([lng, , atMs]) => [lng, 52.01, atMs]);
    const second = applyVehicles(
      first,
      [vehicle("bus-1", elsewhere as LiveVehicle["track"])],
      T0 + 5_000,
      MOTION_TIMING,
    );
    expect(lngAt(second, T0 + 5_000)).toBeCloseTo(20.05, 6);
  });

  it("jumps straight to the new track when motion is reduced", () => {
    const first = applyVehicles(
      new Map(),
      [vehicle("bus-1", east(20, T0))],
      T0,
      REDUCED_MOTION_TIMING,
    );
    lngAt(first, T0 + 5_000, REDUCED_MOTION_TIMING);
    const second = applyVehicles(
      first,
      [vehicle("bus-1", east(19.999, T0 + 5_000))],
      T0 + 5_000,
      REDUCED_MOTION_TIMING,
    );
    const [feature] = vehicleCollection(second, T0 + 5_000, REDUCED_MOTION_TIMING, false).features;
    expect(feature?.geometry.coordinates[0]).toBeCloseTo(19.999, 6);
    expect(feature?.properties.opacity).toBe(1);
  });

  it("fades out a vehicle that left the data, then drops it", () => {
    const first = applyVehicles(new Map(), [vehicle("bus-1", east(20, T0))], T0, MOTION_TIMING);
    const gone = applyVehicles(first, [], T0 + 5_000, MOTION_TIMING);
    const opacityAt = (now: number) =>
      vehicleCollection(gone, now, MOTION_TIMING, false).features[0]?.properties.opacity;
    expect(opacityAt(T0 + 5_000)).toBe(1);
    expect(opacityAt(T0 + 5_200)).toBeCloseTo(0.5);
    const done = applyVehicles(gone, [], T0 + 5_000 + MOTION_TIMING.fadeMs, MOTION_TIMING);
    expect(done.size).toBe(0);
  });
});

describe("vehicleCollection", () => {
  it("draws the previous and next vehicle as opaque as the rider's, dims stale data", () => {
    const state = applyVehicles(
      new Map(),
      [vehicle("bus-1", east(20, T0)), vehicle("bus-2", east(20, T0), "ahead")],
      T0,
      REDUCED_MOTION_TIMING,
    );
    const [ride, ahead] = vehicleCollection(state, T0, REDUCED_MOTION_TIMING, false).features;
    expect(ride?.properties.opacity).toBe(1);
    expect(ahead?.properties.opacity).toBe(1);
    expect(ahead?.properties.role).toBe("ahead");
    const stale = vehicleCollection(state, T0, REDUCED_MOTION_TIMING, true).features[0];
    expect(stale?.properties.opacity).toBe(0.5);
  });

  it("points the icon along the direction of travel", () => {
    const state = applyVehicles(
      new Map(),
      [vehicle("bus-1", east(20, T0))],
      T0,
      REDUCED_MOTION_TIMING,
    );
    const [feature] = vehicleCollection(state, T0 + 5_000, REDUCED_MOTION_TIMING, false).features;
    // Driving east is a bearing of about 90°.
    expect(feature?.properties.bearingDeg).toBeCloseTo(90, 0);
  });
});
