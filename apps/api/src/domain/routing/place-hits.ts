import { bboxAround, cumulativeDistancesM, isInBbox, projectOnPolyline } from "./geometry";
import type { Network, Pattern, PlaceHit, PlacePoint } from "./types";

export const VISIBLE_RADIUS_M = 150;

/** Time offset from the pattern's first stop at a distance along its shape. */
function atSecForAlongM(pattern: Pattern, alongM: number): number | null {
  const { stops } = pattern;
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (!first || !last || alongM < first.alongM || alongM > last.alongM) return null;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i] as (typeof stops)[number];
    const b = stops[i + 1] as (typeof stops)[number];
    if (alongM <= b.alongM) {
      const span = b.alongM - a.alongM;
      const t = span > 0 ? (alongM - a.alongM) / span : 0;
      return a.atSec + t * (b.atSec - a.atSec);
    }
  }
  return last.atSec;
}

/** For every pattern, the places within `radiusM` of its shape, sorted by time along the ride. */
export function computePlaceHits(
  network: Network,
  places: PlacePoint[],
  radiusM = VISIBLE_RADIUS_M,
): Map<string, PlaceHit[]> {
  const out = new Map<string, PlaceHit[]>();
  for (const pattern of network.patterns.values()) {
    const bbox = bboxAround(pattern.lngLats, radiusM);
    const candidates = places.filter((p) => isInBbox(p.position, bbox));
    if (candidates.length === 0) continue;
    const cumDistM = cumulativeDistancesM(pattern.lngLats);
    const hits: PlaceHit[] = [];
    for (const place of candidates) {
      const { distanceM, alongM } = projectOnPolyline(place.position, pattern.lngLats, cumDistM);
      if (distanceM > radiusM) continue;
      const atSec = atSecForAlongM(pattern, alongM);
      if (atSec !== null) hits.push({ placeId: place.id, atSec, distanceM });
    }
    if (hits.length > 0)
      out.set(
        pattern.id,
        hits.sort((a, b) => a.atSec - b.atSec),
      );
  }
  return out;
}
