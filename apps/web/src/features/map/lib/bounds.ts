export type LngLat = [number, number];
export type LngLatBounds = [LngLat, LngLat];

/** [[west, south], [east, north]] around the points; null when there are none. */
export function boundsOf(points: readonly LngLat[]): LngLatBounds | null {
  if (points.length === 0) return null;
  const lngs = points.map(([lng]) => lng);
  const lats = points.map(([, lat]) => lat);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}
