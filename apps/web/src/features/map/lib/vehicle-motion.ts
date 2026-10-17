import { type LiveVehicle, positionOnTrack } from "@sawa/shared";

export type LngLat = [number, number];

/** How a vehicle moves on the map: a glide to each new prediction, and fades in and out. */
export type MotionTiming = { blendMs: number; fadeMs: number };

export const MOTION_TIMING: MotionTiming = { blendMs: 800, fadeMs: 400 };
/** `prefers-reduced-motion`: positions jump, nothing fades. */
export const REDUCED_MOTION_TIMING: MotionTiming = { blendMs: 0, fadeMs: 0 };

/** Vehicles of the other trips of the line are drawn fainter than the rider's own. */
const OTHER_VEHICLE_OPACITY = 0.6;
/** ZTM has not answered for a while; the positions are from the last good fetch. */
const STALE_OPACITY = 0.5;

export type TrackedVehicle = {
  vehicle: LiveVehicle;
  /** Where the vehicle was drawn when `vehicle` arrived; the glide starts there. */
  from?: LngLat;
  /** When `vehicle` arrived, epoch ms. */
  since: number;
  /** When the vehicle first showed up, epoch ms; drives the fade-in. */
  appearedAt: number;
  /** When the vehicle dropped out of the data, epoch ms; it fades out and then goes. */
  goneAt?: number;
};

export type VehicleMotionState = Map<string, TrackedVehicle>;

export type VehicleProperties = {
  id: string;
  mode: LiveVehicle["mode"];
  role: LiveVehicle["role"];
  bearingDeg: number;
  opacity: number;
};

export type VehicleCollection = {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    geometry: { type: "Point"; coordinates: LngLat };
    properties: VehicleProperties;
  }[];
};

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** Where a tracked vehicle is drawn at `now` and which way it faces. */
function placeAt(
  tracked: TrackedVehicle,
  now: number,
  timing: MotionTiming,
): { lngLat: LngLat; bearingDeg: number } | undefined {
  const onTrack = positionOnTrack(tracked.vehicle.track, now);
  if (!onTrack) return undefined;
  const { from } = tracked;
  if (!from) return onTrack;
  const k = timing.blendMs > 0 ? easeOut(clamp01((now - tracked.since) / timing.blendMs)) : 1;
  return {
    lngLat: [
      from[0] + (onTrack.lngLat[0] - from[0]) * k,
      from[1] + (onTrack.lngLat[1] - from[1]) * k,
    ],
    bearingDeg: onTrack.bearingDeg,
  };
}

/**
 * Takes a new set of vehicles (a fresh response). Each vehicle keeps gliding from the spot where
 * it is drawn now, so a new prediction never makes it jump; vehicles that left the data fade out.
 */
export function applyVehicles(
  prev: VehicleMotionState,
  vehicles: readonly LiveVehicle[],
  now: number,
  timing: MotionTiming,
): VehicleMotionState {
  const next: VehicleMotionState = new Map();
  for (const vehicle of vehicles) {
    const before = prev.get(vehicle.id);
    const visible = before && before.goneAt === undefined ? before : undefined;
    next.set(vehicle.id, {
      vehicle,
      from: visible ? placeAt(visible, now, timing)?.lngLat : undefined,
      since: now,
      appearedAt: visible ? visible.appearedAt : now,
    });
  }
  for (const [id, before] of prev) {
    if (next.has(id)) continue;
    const goneAt = before.goneAt ?? now;
    if (now - goneAt < timing.fadeMs) next.set(id, { ...before, goneAt });
  }
  return next;
}

function fadeOf(tracked: TrackedVehicle, now: number, timing: MotionTiming): number {
  if (tracked.goneAt !== undefined) {
    return timing.fadeMs > 0 ? clamp01(1 - (now - tracked.goneAt) / timing.fadeMs) : 0;
  }
  return timing.fadeMs > 0 ? clamp01((now - tracked.appearedAt) / timing.fadeMs) : 1;
}

/** GeoJSON for the map source, one frame: positions at `now`, with fades and the data's staleness. */
export function vehicleCollection(
  state: VehicleMotionState,
  now: number,
  timing: MotionTiming,
  stale: boolean,
): VehicleCollection {
  const features: VehicleCollection["features"] = [];
  for (const tracked of state.values()) {
    const place = placeAt(tracked, now, timing);
    if (!place) continue;
    const { vehicle } = tracked;
    const share = vehicle.role === "ride" ? 1 : OTHER_VEHICLE_OPACITY;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: place.lngLat },
      properties: {
        id: vehicle.id,
        mode: vehicle.mode,
        role: vehicle.role,
        bearingDeg: place.bearingDeg,
        opacity: fadeOf(tracked, now, timing) * share * (stale ? STALE_OPACITY : 1),
      },
    });
  }
  return { type: "FeatureCollection", features };
}
