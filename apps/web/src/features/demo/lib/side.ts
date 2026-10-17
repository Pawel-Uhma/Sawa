import type { Side } from "@sawa/shared";
import type { LngLat } from "./mock-data";

/** Metres per degree of latitude; longitude shrinks with cos(lat). */
const M_PER_DEG = 111_320;
/** Farther than this from the path the side is a guess, so Sawa does not name it. */
const MAX_DISTANCE_M = 250;
/** Closer than this the place is on the path itself (a square the tram crosses). */
const MIN_DISTANCE_M = 3;

/**
 * Which side of the ride a place is on, facing the direction of `path`: the nearest segment
 * decides, the sign of the cross product says left or right. Undefined when it is not clear.
 */
export function sideOfPath(path: readonly LngLat[], point: LngLat): Side | undefined {
  const kx = M_PER_DEG * Math.cos((point[1] * Math.PI) / 180);
  const toM = ([lng, lat]: LngLat): [number, number] => [
    (lng - point[0]) * kx,
    (lat - point[1]) * M_PER_DEG,
  ];
  let best: { distance: number; cross: number } | undefined;
  for (let i = 1; i < path.length; i++) {
    const [ax, ay] = toM(path[i - 1]);
    const [bx, by] = toM(path[i]);
    const dx = bx - ax;
    const dy = by - ay;
    const length2 = dx * dx + dy * dy;
    if (length2 === 0) continue;
    // The point is the origin, so the projection of (0 - a) onto the segment.
    const t = Math.max(0, Math.min(1, (-ax * dx - ay * dy) / length2));
    const distance = Math.hypot(ax + t * dx, ay + t * dy);
    if (!best || distance < best.distance) best = { distance, cross: dx * -ay - dy * -ax };
  }
  if (!best || best.distance > MAX_DISTANCE_M || best.distance < MIN_DISTANCE_M) return undefined;
  return best.cross > 0 ? "left" : "right";
}
