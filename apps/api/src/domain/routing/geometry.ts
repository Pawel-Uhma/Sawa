import { haversineM, type LatLng } from "@sawa/shared";
import type { LngLat } from "./types";

const M_PER_DEG_LAT = 111_320;

export type Bbox = { minLng: number; minLat: number; maxLng: number; maxLat: number };

export function cumulativeDistancesM(lngLats: LngLat[]): number[] {
  const out: number[] = [];
  let total = 0;
  lngLats.forEach(([lng, lat], i) => {
    const prev = lngLats[i - 1];
    if (prev) total += haversineM({ lat: prev[1], lng: prev[0] }, { lat, lng });
    out.push(total);
  });
  return out;
}

/**
 * Closest point of a polyline to `point`. Uses a local equirectangular projection,
 * which is accurate to well under a metre at city scale.
 */
export function projectOnPolyline(
  point: LatLng,
  lngLats: LngLat[],
  cumDistM: number[],
): { distanceM: number; alongM: number } {
  const mPerDegLng = M_PER_DEG_LAT * Math.cos((point.lat * Math.PI) / 180);
  const toXY = ([lng, lat]: LngLat) => [
    (lng - point.lng) * mPerDegLng,
    (lat - point.lat) * M_PER_DEG_LAT,
  ];
  let best = { distanceM: Number.POSITIVE_INFINITY, alongM: 0 };
  for (let i = 0; i < lngLats.length - 1; i++) {
    const [ax, ay] = toXY(lngLats[i] as LngLat);
    const [bx, by] = toXY(lngLats[i + 1] as LngLat);
    const dx = (bx as number) - (ax as number);
    const dy = (by as number) - (ay as number);
    const lenSq = dx * dx + dy * dy;
    // Point is the origin of the local frame, so project (0,0) onto segment A→B.
    const t =
      lenSq === 0
        ? 0
        : Math.min(1, Math.max(0, -((ax as number) * dx + (ay as number) * dy) / lenSq));
    const px = (ax as number) + t * dx;
    const py = (ay as number) + t * dy;
    const distanceM = Math.hypot(px, py);
    if (distanceM < best.distanceM) {
      const segStart = cumDistM[i] as number;
      const segLen = (cumDistM[i + 1] as number) - segStart;
      best = { distanceM, alongM: segStart + t * segLen };
    }
  }
  return best;
}

/** Part of a polyline between two distances along it, with interpolated end points. */
export function slicePolyline(
  lngLats: LngLat[],
  cumDistM: number[],
  fromM: number,
  toM: number,
): LngLat[] {
  const at = (m: number): LngLat => {
    const i = Math.max(0, cumDistM.findIndex((d) => d >= m) - 1);
    const a = lngLats[i] as LngLat;
    const b = (lngLats[i + 1] ?? a) as LngLat;
    const segLen = (cumDistM[i + 1] ?? 0) - (cumDistM[i] as number);
    const t = segLen > 0 ? (m - (cumDistM[i] as number)) / segLen : 0;
    const clamped = Math.min(1, Math.max(0, t));
    return [a[0] + (b[0] - a[0]) * clamped, a[1] + (b[1] - a[1]) * clamped];
  };
  const inner = lngLats.filter(
    (_, i) => (cumDistM[i] as number) > fromM && (cumDistM[i] as number) < toM,
  );
  return [at(fromM), ...inner, at(toM)];
}

export function bboxAround(lngLats: LngLat[], paddingM: number): Bbox {
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  for (const [lng, lat] of lngLats) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }
  const padLat = paddingM / M_PER_DEG_LAT;
  const padLng = paddingM / (M_PER_DEG_LAT * Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180));
  return {
    minLng: minLng - padLng,
    minLat: minLat - padLat,
    maxLng: maxLng + padLng,
    maxLat: maxLat + padLat,
  };
}

export function isInBbox(p: LatLng, b: Bbox): boolean {
  return p.lng >= b.minLng && p.lng <= b.maxLng && p.lat >= b.minLat && p.lat <= b.maxLat;
}
