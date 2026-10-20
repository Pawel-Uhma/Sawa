import { z } from "zod";
import { bikeInfraShare } from "../../domain/routing/bike-friendly";
import type { WalkRouterLogger } from "../osrm/walk-paths";

type LngLat = [number, number];

const TIMEOUT_MS = 4_000;
/** `trace_attributes` takes points, not a line: this many are enough to match a city ride. */
const MAX_POINTS = 300;

const TraceSchema = z.object({
  edges: z.array(
    z.object({
      length: z.number().optional(),
      use: z.string().optional(),
      cycle_lane: z.string().optional(),
    }),
  ),
});

/**
 * How bike-friendly a drawn path is: Valhalla `trace_attributes` matches it to the road graph,
 * then `bikeInfraShare` (0–1). Undefined when the server fails, so the caller keeps its order.
 */
export function createValhallaBikeInfraScorer(baseUrl: string, logger?: WalkRouterLogger) {
  return async (path: readonly LngLat[]): Promise<number | undefined> => {
    if (path.length < 2) return undefined;
    const step = Math.max(1, Math.ceil(path.length / MAX_POINTS));
    const shape = path
      .filter((_, i) => i % step === 0 || i === path.length - 1)
      .map(([lng, lat]) => ({ lat: +lat.toFixed(6), lon: +lng.toFixed(6) }));
    try {
      const res = await fetch(`${baseUrl}/trace_attributes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "sawa-api (Warsaw Open Data Hackathon)",
        },
        body: JSON.stringify({
          shape,
          costing: "bicycle",
          shape_match: "map_snap",
          filters: {
            attributes: ["edge.use", "edge.cycle_lane", "edge.length"],
            action: "include",
          },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        logger?.warn({ router: "valhalla", status: res.status }, "bike infra trace failed");
        return undefined;
      }
      const parsed = TraceSchema.safeParse(await res.json());
      return parsed.success ? bikeInfraShare(parsed.data.edges) : undefined;
    } catch (err) {
      logger?.warn({ router: "valhalla", err: String(err) }, "bike infra trace failed");
      return undefined;
    }
  };
}
