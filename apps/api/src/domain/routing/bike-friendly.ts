import { haversineM } from "@sawa/shared";

type LngLat = [number, number];

/** One road edge of a matched path (Valhalla `trace_attributes`): length in km. */
export type TraceEdge = { length?: number; use?: string; cycle_lane?: string };

/**
 * Share of the length on bike infrastructure: bike paths (`cycleway`), shared paths and roads
 * with a bike lane. Sidewalks and plain roads do not count. 0 for no edges.
 */
export function bikeInfraShare(edges: readonly TraceEdge[]): number {
  let total = 0;
  let bike = 0;
  for (const edge of edges) {
    const length = edge.length ?? 0;
    total += length;
    const lane = edge.cycle_lane !== undefined && edge.cycle_lane !== "none";
    if (edge.use === "cycleway" || edge.use === "path" || lane) bike += length;
  }
  return total > 0 ? bike / total : 0;
}

/** Path length in metres. */
export function pathLengthM(path: readonly LngLat[]): number {
  let m = 0;
  for (let i = 1; i < path.length; i++) {
    const [lng1, lat1] = path[i - 1] as LngLat;
    const [lng2, lat2] = path[i] as LngLat;
    m += haversineM({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 });
  }
  return m;
}

/** How much a detour costs: 10% longer than the shortest candidate takes 0.15 off the share. */
export const DETOUR_WEIGHT = 1.5;
/** Candidates longer than this times the shortest one are not taken, however friendly. */
export const MAX_DETOUR = 1.3;

export type BikeCandidate = { path: LngLat[]; share: number | undefined };

/**
 * The bike path to draw: the one with the most bike infrastructure, minus a penalty for being
 * longer than the shortest candidate. Without a share (scoring failed) a candidate counts as
 * 0. Candidates come in the router order, so on a tie the first (OSRM) wins. Null for none.
 */
export function pickBikePath(candidates: readonly BikeCandidate[]): LngLat[] | null {
  const lengths = candidates.map((c) => pathLengthM(c.path));
  const shortest = Math.min(...lengths);
  let best: { path: LngLat[]; score: number } | null = null;
  candidates.forEach((candidate, i) => {
    const length = lengths[i] as number;
    const detour = shortest > 0 ? length / shortest : 1;
    if (detour > MAX_DETOUR) return;
    const score = (candidate.share ?? 0) - DETOUR_WEIGHT * (detour - 1);
    if (!best || score > best.score) best = { path: candidate.path, score };
  });
  return (best as { path: LngLat[] } | null)?.path ?? null;
}
