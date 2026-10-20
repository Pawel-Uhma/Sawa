import { type LatLng, type Route, toLngLat } from "@sawa/shared";
import type { LngLat } from "./bounds";

/** Zoom the camera goes to when a ride starts and while it follows the user (#193). */
export const NAV_ZOOM = 16.5;

/** Camera tilt of the 3D view (#199); MapLibre's default `maxPitch` is 60. */
export const PITCH_3D = 60;

/** Buildings rise only from this zoom: below it they are tiny and cost the most on weak phones. */
export const BUILDINGS_MIN_ZOOM = 14.5;

/** GPS moves shorter than this are noise, so they do not turn the heading. */
export const MIN_HEADING_MOVE_M = 8;

/** Farther than this from the route the user is off it, and an arrow along it would mislead. */
export const MAX_OFF_ROUTE_M = 150;

/** Longest arrow ahead of the user, so it points the way instead of drawing the whole route. */
export const GUIDE_MAX_M = 500;

/** A route place closer than this ahead counts as reached; the arrow goes on to the next one. */
const REACHED_M = 20;

/** Of two stretches nearly as close (a loop passes the start twice), the earlier one wins. */
const SAME_DISTANCE_M = 25;

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

type Path = { points: LngLat[]; cumM: number[] };

/** All legs one after another, without repeated points where a leg ends and the next begins. */
function routePath(route: Route): Path {
  const points: LngLat[] = [];
  for (const leg of route.legs) {
    for (const p of leg.lngLats) {
      const last = points.at(-1);
      if (!last || last[0] !== p[0] || last[1] !== p[1]) points.push([p[0], p[1]]);
    }
  }
  const cumM = [0];
  for (let i = 1; i < points.length; i++) {
    const [dx, dy] = offsetM(points[i - 1] as LngLat, points[i] as LngLat);
    cumM.push((cumM[i - 1] as number) + Math.hypot(dx, dy));
  }
  return { points, cumM };
}

type Projection = { alongM: number; distanceM: number };

/**
 * Nearest point of the path to `p`; the earliest stretch among nearly equal ones. With `fromM`,
 * null when that point lies behind it (a place already passed).
 */
function project(path: Path, p: LngLat, fromM = 0): Projection | null {
  const candidates: Projection[] = [];
  for (let i = 0; i < path.points.length - 1; i++) {
    const a = path.points[i] as LngLat;
    const b = path.points[i + 1] as LngLat;
    const [bx, by] = offsetM(a, b);
    const [px, py] = offsetM(a, p);
    const length2 = bx * bx + by * by;
    const t = length2 > 0 ? Math.min(1, Math.max(0, (px * bx + py * by) / length2)) : 0;
    const alongM = (path.cumM[i] as number) + t * Math.sqrt(length2);
    candidates.push({ alongM, distanceM: Math.hypot(px - t * bx, py - t * by) });
  }
  if (candidates.length === 0) return null;
  const nearest = Math.min(...candidates.map((c) => c.distanceM));
  return (
    candidates.find((c) => c.alongM >= fromM && c.distanceM <= nearest + SAME_DISTANCE_M) ?? null
  );
}

/** Point `alongM` metres along the path. */
function pointAt(path: Path, alongM: number): LngLat {
  const { points, cumM } = path;
  let i = 0;
  while (i < points.length - 2 && (cumM[i + 1] as number) < alongM) i++;
  const a = points[i] as LngLat;
  const b = points[i + 1] ?? a;
  const span = (cumM[i + 1] ?? 0) - (cumM[i] as number);
  const t = span > 0 ? Math.min(1, Math.max(0, (alongM - (cumM[i] as number)) / span)) : 0;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/**
 * Arrow along `Leg.lngLats` from where the user is on the route to the next route place ahead
 * (or the end of the route), at most GUIDE_MAX_M. Null when the user is off the route or at its end.
 */
export function guidePath(route: Route, user: LatLng, maxM = GUIDE_MAX_M): LngLat[] | null {
  const path = routePath(route);
  if (path.points.length < 2) return null;
  const here = project(path, toLngLat(user));
  if (!here || here.distanceM > MAX_OFF_ROUTE_M) return null;
  const totalM = path.cumM.at(-1) as number;
  const nextPlaceM = route.places
    .map((place) => project(path, toLngLat(place.position), here.alongM)?.alongM)
    .filter((m): m is number => m !== undefined && m > here.alongM + REACHED_M)
    .sort((a, b) => a - b)[0];
  const endM = Math.min(nextPlaceM ?? totalM, here.alongM + maxM);
  if (endM - here.alongM < REACHED_M / 2) return null;
  const line: LngLat[] = [pointAt(path, here.alongM)];
  for (let i = 0; i < path.points.length; i++) {
    const m = path.cumM[i] as number;
    if (m > here.alongM && m < endM) line.push(path.points[i] as LngLat);
  }
  line.push(pointAt(path, endM));
  return line;
}
