import { pickBikePath } from "../domain/routing/bike-friendly";
import type { WalkPathSource } from "./ports";

type LngLat = [number, number];

/**
 * Bike legs drawn along bike paths when one of the routers finds them: every candidate router
 * draws the leg, `score` says how much of it runs on bike infrastructure, and the friendliest
 * path that is not a long detour wins (`pickBikePath`). The routers differ ride to ride
 * (OSRM bike profile vs Valhalla with `use_roads` low), so neither alone is enough.
 */
export function createBikeFriendlyPathSource(
  candidates: readonly WalkPathSource[],
  score: (path: LngLat[]) => Promise<number | undefined>,
): WalkPathSource {
  return {
    async path(points) {
      const paths = await Promise.all(candidates.map((source) => source.path(points)));
      const drawn = paths.filter((p): p is LngLat[] => Boolean(p && p.length >= 2));
      if (drawn.length <= 1) return drawn[0];
      const shares = await Promise.all(drawn.map((p) => score(p)));
      return pickBikePath(drawn.map((path, i) => ({ path, share: shares[i] }))) ?? drawn[0];
    },
  };
}
