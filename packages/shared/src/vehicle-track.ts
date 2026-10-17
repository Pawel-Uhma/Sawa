import type { VehicleTrackPoint } from "./schemas/vehicles";

export type TrackPosition = {
  lngLat: [number, number];
  /** Direction of travel, degrees clockwise from north (for rotating the icon). */
  bearingDeg: number;
};

const toRad = (deg: number) => (deg * Math.PI) / 180;

function bearingDeg(a: VehicleTrackPoint, b: VehicleTrackPoint): number {
  const dLng = toRad(b[0] - a[0]);
  const y = Math.sin(dLng) * Math.cos(toRad(b[1]));
  const x =
    Math.cos(toRad(a[1])) * Math.sin(toRad(b[1])) -
    Math.sin(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Where a vehicle is at `atMs` on its predicted track (`LiveVehicle.track`), linearly
 * interpolated; before the first point → the first point, after the last → the last one.
 * Call it every animation frame with `Date.now()` for smooth motion between 10 s updates.
 */
export function positionOnTrack(
  track: VehicleTrackPoint[],
  atMs: number,
): TrackPosition | undefined {
  const first = track[0];
  if (!first) return undefined;
  let i = 0;
  while (i < track.length - 2 && (track[i + 1] as VehicleTrackPoint)[2] <= atMs) i++;
  const a = track[i] as VehicleTrackPoint;
  const b = track[i + 1] ?? a;
  const span = b[2] - a[2];
  const t = span > 0 ? Math.min(1, Math.max(0, (atMs - a[2]) / span)) : 0;
  // A standing vehicle keeps the heading of the last stretch it moved along.
  let from = a;
  let to = b;
  for (let j = i; j > 0 && from[0] === to[0] && from[1] === to[1]; j--) {
    from = track[j - 1] as VehicleTrackPoint;
    to = track[j] as VehicleTrackPoint;
  }
  return {
    lngLat: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
    bearingDeg: from[0] === to[0] && from[1] === to[1] ? 0 : bearingDeg(from, to),
  };
}
