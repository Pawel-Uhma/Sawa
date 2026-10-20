import type { LngLat } from "./bounds";

/** Zoom the camera goes to when a ride starts and while it follows the user (#193). */
export const NAV_ZOOM = 16.5;

/** Camera tilt of the 3D view (#199); MapLibre's default `maxPitch` is 60. */
export const PITCH_3D = 60;

/** Buildings rise only from this zoom: below it they are tiny and cost the most on weak phones. */
export const BUILDINGS_MIN_ZOOM = 14.5;

/** GPS moves shorter than this are noise, so they do not turn the heading. */
export const MIN_HEADING_MOVE_M = 8;

const M_PER_DEG_LAT = 110_540;
const mPerDegLng = (lat: number) => 111_320 * Math.cos((lat * Math.PI) / 180);

/** Offset from `a` to `b` in metres, east and north (flat Earth, fine within a city). */
function offsetM(a: LngLat, b: LngLat): [number, number] {
  const lat = (a[1] + b[1]) / 2;
  return [(b[0] - a[0]) * mPerDegLng(lat), (b[1] - a[1]) * M_PER_DEG_LAT];
}

/** Compass bearing from `a` to `b`, degrees clockwise from north, 0–360. */
export function bearingDeg(a: LngLat, b: LngLat): number {
  const [dx, dy] = offsetM(a, b);
  return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
}

export type HeadingState = { anchor: LngLat | null; heading: number | null };

export const NO_HEADING: HeadingState = { anchor: null, heading: null };

/**
 * Heading after a new GPS fix. The GPS course wins when the phone gives one (it is null or NaN
 * while standing, and on many desktops); otherwise the direction of the last move of at least
 * MIN_HEADING_MOVE_M. Small jitter keeps the previous heading.
 */
export function nextHeading(
  state: HeadingState,
  position: LngLat,
  gpsHeading?: number | null,
): HeadingState {
  if (typeof gpsHeading === "number" && Number.isFinite(gpsHeading)) {
    return { anchor: position, heading: ((gpsHeading % 360) + 360) % 360 };
  }
  if (!state.anchor) return { anchor: position, heading: state.heading };
  const [dx, dy] = offsetM(state.anchor, position);
  if (Math.hypot(dx, dy) < MIN_HEADING_MOVE_M) return state;
  return { anchor: position, heading: bearingDeg(state.anchor, position) };
}
