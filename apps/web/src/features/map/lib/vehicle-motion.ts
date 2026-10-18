import type { LiveVehicle, VehicleTrackPoint } from "@sawa/shared";

export type LngLat = [number, number];

/**
 * How a vehicle moves on the map. `catchUpMs`: how fast the drawn vehicle closes the gap to
 * its prediction after a new answer (0 = it jumps); `fadeMs`: fade in and out.
 */
export type MotionTiming = { catchUpMs: number; fadeMs: number };

export const MOTION_TIMING: MotionTiming = { catchUpMs: 3000, fadeMs: 400 };
/** `prefers-reduced-motion`: positions jump, nothing fades. */
export const REDUCED_MOTION_TIMING: MotionTiming = { catchUpMs: 0, fadeMs: 0 };

/**
 * Tracks are played slower than predicted. Real vehicles are often slower than the prediction,
 * and catching up forward after the next answer looks fine, while going back does not.
 */
export const TRACK_SPEED_SHARE = 0.85;
/** Most a vehicle speeds up or slows down to meet its prediction, m/s on top of its own speed. */
const MAX_PULL_MPS = 12;
/** The drawn spot is this far off the new track: the vehicle is placed on it without a glide. */
const SNAP_OFF_TRACK_M = 80;
/** ZTM has not answered for a while; the positions are from the last good fetch. */
const STALE_OPACITY = 0.5;

/** A predicted track with the distance along it, in metres, at each point. */
type TrackPath = { points: VehicleTrackPoint[]; cumM: number[] };

/** A vehicle of the answer with the index of its leg in `Route.legs`. */
export type VehicleOnLeg = { legIndex: number; vehicle: LiveVehicle };

export type TrackedVehicle = VehicleOnLeg & {
  path: TrackPath;
  /** Where the vehicle is drawn, metres along `path` (negative = before its first point). */
  alongM: number;
  /** Where the prediction was at `lastMs`, metres along `path`. */
  targetM: number;
  /** Last frame, epoch ms. */
  lastMs: number;
  /** Last direction of travel; a standing vehicle keeps it. */
  bearingDeg: number;
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

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const clamp01 = (t: number) => clamp(t, 0, 1);

const M_PER_DEG_LAT = 110_540;
const mPerDegLng = (lat: number) => 111_320 * Math.cos((lat * Math.PI) / 180);

/** Offset from `a` to `b` in metres, east and north (flat Earth, fine within a city). */
function offsetM(a: readonly number[], b: readonly number[]): [number, number] {
  const lat = ((a[1] as number) + (b[1] as number)) / 2;
  return [
    ((b[0] as number) - (a[0] as number)) * mPerDegLng(lat),
    ((b[1] as number) - (a[1] as number)) * M_PER_DEG_LAT,
  ];
}

function toPath(points: VehicleTrackPoint[]): TrackPath {
  const cumM = [0];
  for (let i = 1; i < points.length; i++) {
    const [dx, dy] = offsetM(points[i - 1] as VehicleTrackPoint, points[i] as VehicleTrackPoint);
    cumM.push((cumM[i - 1] as number) + Math.hypot(dx, dy));
  }
  return { points, cumM };
}

/** Where the (slowed down) prediction is at `now`, metres along the path. */
function targetAlong(path: TrackPath, now: number): number {
  const { points, cumM } = path;
  const first = points[0];
  if (!first) return 0;
  const atMs = first[2] + (now - first[2]) * TRACK_SPEED_SHARE;
  let i = 0;
  while (i < points.length - 2 && (points[i + 1] as VehicleTrackPoint)[2] <= atMs) i++;
  const a = points[i] as VehicleTrackPoint;
  const b = points[i + 1] ?? a;
  const span = b[2] - a[2];
  const t = span > 0 ? clamp01((atMs - a[2]) / span) : 0;
  const from = cumM[i] as number;
  return from + ((cumM[i + 1] ?? from) - from) * t;
}

/** Index of the stretch of the path with length that holds `alongM` (or the nearest one). */
function stretchAt(path: TrackPath, alongM: number): number | undefined {
  const { cumM } = path;
  let found: number | undefined;
  for (let i = 0; i < cumM.length - 1; i++) {
    if ((cumM[i + 1] as number) <= (cumM[i] as number)) continue;
    found = i;
    if ((cumM[i + 1] as number) >= alongM) break;
  }
  return found;
}

/** Point at `alongM`; before the first point the first stretch is extended backwards. */
function placeAlong(
  path: TrackPath,
  alongM: number,
): { lngLat: LngLat; bearingDeg?: number } | undefined {
  const { points, cumM } = path;
  const first = points[0];
  if (!first) return undefined;
  const i = stretchAt(path, alongM);
  if (i === undefined) return { lngLat: [first[0], first[1]] };
  const a = points[i] as VehicleTrackPoint;
  const b = points[i + 1] as VehicleTrackPoint;
  const from = cumM[i] as number;
  const t = Math.min(1, (alongM - from) / ((cumM[i + 1] as number) - from));
  const [dx, dy] = offsetM(a, b);
  return {
    lngLat: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
    bearingDeg: ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360,
  };
}

/** The spot on the path nearest to `lngLat`: distance along it and how far off it lies. */
function projectOnto(path: TrackPath, lngLat: LngLat): { alongM: number; offM: number } {
  const { points, cumM } = path;
  let best = { alongM: 0, offM: Number.POSITIVE_INFINITY };
  const firstStretch = stretchAt(path, 0);
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i] as VehicleTrackPoint;
    const [sx, sy] = offsetM(a, points[i + 1] as VehicleTrackPoint);
    const [px, py] = offsetM(a, lngLat);
    const len2 = sx * sx + sy * sy;
    if (len2 === 0) continue;
    // Only the first stretch reaches back: the vehicle may be drawn behind its last report.
    const raw = (px * sx + py * sy) / len2;
    const t = i === firstStretch ? Math.min(1, raw) : clamp01(raw);
    const offM = Math.hypot(px - sx * t, py - sy * t);
    if (offM < best.offM) {
      best = { alongM: (cumM[i] as number) + t * Math.sqrt(len2), offM };
    }
  }
  if (best.offM === Number.POSITIVE_INFINITY && points[0]) {
    best = { alongM: 0, offM: Math.hypot(...offsetM(points[0], lngLat)) };
  }
  return best;
}

/**
 * Moves the vehicle along its track to `now`, in place. It follows the prediction and closes
 * the gap to it smoothly; it never goes back: drawn ahead of the prediction, it slows down or
 * waits until the prediction catches up.
 */
function advance(tracked: TrackedVehicle, now: number, timing: MotionTiming): void {
  const dtMs = now - tracked.lastMs;
  if (dtMs <= 0) return;
  const target = targetAlong(tracked.path, now);
  if (timing.catchUpMs <= 0) {
    tracked.alongM = target;
  } else {
    const gap = tracked.targetM - tracked.alongM;
    const maxPull = (MAX_PULL_MPS * dtMs) / 1000;
    const pull = clamp(gap * (1 - Math.exp(-dtMs / timing.catchUpMs)), -maxPull, maxPull);
    tracked.alongM += Math.max(0, target - tracked.targetM + pull);
  }
  tracked.targetM = target;
  tracked.lastMs = now;
}

function placeOf(tracked: TrackedVehicle): { lngLat: LngLat; bearingDeg: number } | undefined {
  const place = placeAlong(tracked.path, tracked.alongM);
  if (!place) return undefined;
  if (place.bearingDeg !== undefined) tracked.bearingDeg = place.bearingDeg;
  return { lngLat: place.lngLat, bearingDeg: tracked.bearingDeg };
}

/**
 * Takes a new set of vehicles (a fresh response). A vehicle already on the map stays where it is
 * drawn and from there follows its new track; vehicles that left the data fade out.
 */
export function applyVehicles(
  prev: VehicleMotionState,
  vehicles: readonly VehicleOnLeg[],
  now: number,
  timing: MotionTiming,
): VehicleMotionState {
  const next: VehicleMotionState = new Map();
  for (const { legIndex, vehicle } of vehicles) {
    const path = toPath(vehicle.track);
    const target = targetAlong(path, now);
    const before = prev.get(vehicle.id);
    const visible = before && before.goneAt === undefined ? before : undefined;
    let alongM = target;
    if (visible && timing.catchUpMs > 0) {
      advance(visible, now, timing);
      const drawn = placeOf(visible);
      const onNew = drawn && projectOnto(path, drawn.lngLat);
      if (onNew && onNew.offM <= SNAP_OFF_TRACK_M) alongM = onNew.alongM;
    }
    next.set(vehicle.id, {
      legIndex,
      vehicle,
      path,
      alongM,
      targetM: target,
      lastMs: now,
      bearingDeg: visible?.bearingDeg ?? 0,
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

/**
 * GeoJSON for the map source, one frame: moves the vehicles to `now` (the state is updated in
 * place, so call it with a growing `now`) and adds fades and the data's staleness.
 */
export function vehicleCollection(
  state: VehicleMotionState,
  now: number,
  timing: MotionTiming,
  stale: boolean,
): VehicleCollection {
  const features: VehicleCollection["features"] = [];
  for (const tracked of state.values()) {
    advance(tracked, now, timing);
    const place = placeOf(tracked);
    if (!place) continue;
    const { vehicle } = tracked;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: place.lngLat },
      properties: {
        id: vehicle.id,
        mode: vehicle.mode,
        role: vehicle.role,
        bearingDeg: place.bearingDeg,
        opacity: fadeOf(tracked, now, timing) * (stale ? STALE_OPACITY : 1),
      },
    });
  }
  return { type: "FeatureCollection", features };
}
