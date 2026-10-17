import type { VehicleTrackPoint } from "@sawa/shared";
import type { LngLat } from "../routing/types";
import type { PatternGeometry } from "./along";
import { alongAtTime } from "./predict";
import type { Knot } from "./types";

/** Point on the shape at a distance along it, clamped to its ends. */
export function pointAtAlong(geometry: PatternGeometry, alongM: number): LngLat {
  const { lngLats } = geometry.pattern;
  const cum = geometry.cumDistM;
  const m = Math.min(geometry.lengthM, Math.max(0, alongM));
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((cum[mid] as number) <= m) lo = mid;
    else hi = mid;
  }
  const a = lngLats[lo] as LngLat;
  const b = (lngLats[hi] ?? a) as LngLat;
  const span = (cum[hi] as number) - (cum[lo] as number);
  const t = span > 0 ? (m - (cum[lo] as number)) / span : 0;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

const round6 = (v: number) => Math.round(v * 1e6) / 1e6;

/**
 * Knots → `[lng, lat, atMs]` up to `endMs`, with the shape's vertices in between, so the
 * vehicle follows the curves of the street instead of cutting corners.
 */
export function knotsToTrack(
  knots: Knot[],
  geometry: PatternGeometry,
  endMs: number,
): VehicleTrackPoint[] {
  const first = knots[0];
  if (!first) return [];
  const cut = knots.filter((k) => k.atMs < endMs);
  if (endMs > first.atMs) cut.push({ atMs: endMs, alongM: alongAtTime(knots, endMs) });
  const out: VehicleTrackPoint[] = [];
  const push = (alongM: number, atMs: number) => {
    const [lng, lat] = pointAtAlong(geometry, alongM);
    out.push([round6(lng), round6(lat), Math.round(atMs)]);
  };
  cut.forEach((k, i) => {
    const prev = cut[i - 1];
    if (prev && k.alongM > prev.alongM) {
      geometry.cumDistM.forEach((d) => {
        if (d <= prev.alongM || d >= k.alongM) return;
        const t = (d - prev.alongM) / (k.alongM - prev.alongM);
        push(d, prev.atMs + t * (k.atMs - prev.atMs));
      });
    }
    push(k.alongM, k.atMs);
  });
  return out;
}
