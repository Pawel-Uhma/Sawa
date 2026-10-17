const M_PER_DEG_LAT = 111_320;

type LngLat = [number, number];

/** Douglas–Peucker on a local metric projection. Keeps the first and last point. */
export function simplifyLine(points: LngLat[], toleranceM: number): LngLat[] {
  if (points.length <= 2) return points;
  const lat0 = (points[0] as LngLat)[1];
  const mPerDegLng = M_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);
  const xy = points.map(([lng, lat]) => [lng * mPerDegLng, lat * M_PER_DEG_LAT] as const);

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];

  while (stack.length > 0) {
    const [start, end] = stack.pop() as [number, number];
    const [ax, ay] = xy[start] as readonly [number, number];
    const [bx, by] = xy[end] as readonly [number, number];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    let maxDist = 0;
    let maxIndex = -1;
    for (let i = start + 1; i < end; i++) {
      const [px, py] = xy[i] as readonly [number, number];
      const dist =
        len === 0
          ? Math.hypot(px - ax, py - ay)
          : Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }
    if (maxIndex >= 0 && maxDist > toleranceM) {
      keep[maxIndex] = 1;
      stack.push([start, maxIndex], [maxIndex, end]);
    }
  }
  return points.filter((_, i) => keep[i] === 1);
}

/** Path length in metres (equirectangular, city scale). */
export function lengthM(points: LngLat[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const [lng1, lat1] = points[i - 1] as LngLat;
    const [lng2, lat2] = points[i] as LngLat;
    const mPerDegLng = M_PER_DEG_LAT * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
    total += Math.hypot((lng2 - lng1) * mPerDegLng, (lat2 - lat1) * M_PER_DEG_LAT);
  }
  return total;
}
