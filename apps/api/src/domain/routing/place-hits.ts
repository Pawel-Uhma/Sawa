import { type Bbox, bboxAround, cumulativeDistancesM, projectOnSegment } from "./geometry";
import type { LngLat, Network, Pattern, PlaceHit, PlacePoint } from "./types";

export const VISIBLE_RADIUS_M = 150;
/** Grid cell of the place index, ~270 × 450 m in Warsaw. */
const CELL_DEG = 0.004;
/** The segment boxes use the latitude of the segment, the projection that of the place. */
const BOX_SLACK_M = 1;

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

/** Places by grid cell, so each segment only looks at the places near it. */
function indexByCell(places: PlacePoint[]): Map<string, number[]> {
  const cells = new Map<string, number[]>();
  places.forEach(({ position }, i) => {
    const key = `${Math.floor(position.lng / CELL_DEG)}:${Math.floor(position.lat / CELL_DEG)}`;
    const cell = cells.get(key);
    if (cell) cell.push(i);
    else cells.set(key, [i]);
  });
  return cells;
}

function* placesInBox(cells: Map<string, number[]>, box: Bbox): Generator<number> {
  for (let x = Math.floor(box.minLng / CELL_DEG); x <= Math.floor(box.maxLng / CELL_DEG); x++) {
    for (let y = Math.floor(box.minLat / CELL_DEG); y <= Math.floor(box.maxLat / CELL_DEG); y++) {
      yield* cells.get(`${x}:${y}`) ?? [];
    }
  }
}

/**
 * For every pattern, the places within `radiusM` of its shape, sorted by time along the ride.
 * Same result as projecting every place on every shape, ~20× faster: 4500 places took 3 s,
 * blocking all requests while the planner loaded a new area.
 */
export function computePlaceHits(
  network: Network,
  places: PlacePoint[],
  radiusM = VISIBLE_RADIUS_M,
): Map<string, PlaceHit[]> {
  const cells = indexByCell(places);
  const out = new Map<string, PlaceHit[]>();
  for (const pattern of network.patterns.values()) {
    const { lngLats } = pattern;
    const cumDistM = cumulativeDistancesM(lngLats);
    // Closest point of the shape per place index; segments in order, so ties keep the first.
    const closest = new Map<number, { distanceM: number; alongM: number }>();
    for (let s = 0; s < lngLats.length - 1; s++) {
      const a = lngLats[s] as LngLat;
      const b = lngLats[s + 1] as LngLat;
      for (const i of placesInBox(cells, bboxAround([a, b], radiusM + BOX_SLACK_M))) {
        const { distanceM, t } = projectOnSegment((places[i] as PlacePoint).position, a, b);
        if (distanceM < (closest.get(i)?.distanceM ?? Number.POSITIVE_INFINITY)) {
          const segStart = cumDistM[s] as number;
          const alongM = segStart + t * ((cumDistM[s + 1] as number) - segStart);
          closest.set(i, { distanceM, alongM });
        }
      }
    }
    const hits: PlaceHit[] = [];
    // In input order, as before, so equal times keep their order after the sort.
    for (const i of [...closest.keys()].sort((x, y) => x - y)) {
      const { distanceM, alongM } = closest.get(i) as { distanceM: number; alongM: number };
      if (distanceM > radiusM) continue;
      const atSec = atSecForAlongM(pattern, alongM);
      if (atSec !== null) hits.push({ placeId: (places[i] as PlacePoint).id, atSec, distanceM });
    }
    if (hits.length > 0)
      out.set(
        pattern.id,
        hits.sort((a, b) => a.atSec - b.atSec),
      );
  }
  return out;
}
