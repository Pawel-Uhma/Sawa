import { z } from "zod";
import { LatLngSchema } from "./common";
import { isTransitMode, type Route } from "./route";

/** How often a client should ask again; ZTM refreshes positions every 10 s. */
export const VEHICLES_REFRESH_SEC = 10;

export const TrackLegSchema = z.object({
  /** Index of the leg in `Route.legs`, echoed in the response; defaults to the position here. */
  legIndex: z.number().int().nonnegative().optional(),
  line: z.string().min(1),
  /** `Leg.fromStop.id` and `Leg.toStop.id` of the planned route. */
  fromStopId: z.string().min(1),
  toStopId: z.string().min(1),
  /** `Leg.departAt`, ISO 8601: picks the vehicle the rider boards. */
  departAt: z.iso.datetime({ offset: true }),
});
export type TrackLeg = z.infer<typeof TrackLegSchema>;

export const TrackVehiclesRequestSchema = z.object({
  legs: z.array(TrackLegSchema).min(1).max(12),
});
export type TrackVehiclesRequest = z.infer<typeof TrackVehiclesRequestSchema>;

/**
 * Predicted path: [lng, lat, atMs] with `atMs` in epoch milliseconds, ascending.
 * Starts at the last reported position and runs about 2 minutes past `generatedAt`.
 */
export const VehicleTrackPointSchema = z.tuple([z.number(), z.number(), z.number()]);
export type VehicleTrackPoint = z.infer<typeof VehicleTrackPointSchema>;

export const LiveVehicleSchema = z.object({
  /** Stable between responses: mode + ZTM vehicle number. */
  id: z.string(),
  line: z.string(),
  mode: z.enum(["tram", "bus"]),
  brigade: z.string(),
  /** `ride`: the vehicle the rider boards; `ahead`/`behind`: the previous and next one of the line. */
  role: z.enum(["ride", "ahead", "behind"]),
  /** Last position reported by ZTM (vehicles report every 10–30 s). */
  position: LatLngSchema,
  /** ISO 8601 */
  reportedAt: z.string(),
  /** When it is (or was) at the boarding stop, ISO 8601; missing when unknown. */
  boardAt: z.string().optional(),
  /**
   * What the prediction is based on: `leader` = how the previous vehicle of the line drove
   * this stretch (traffic jams included), `schedule` = GTFS timetable speed, `hold` = standing
   * at the terminus.
   */
  speedSource: z.enum(["leader", "schedule", "hold"]),
  track: z.array(VehicleTrackPointSchema).min(1),
});
export type LiveVehicle = z.infer<typeof LiveVehicleSchema>;

export const LegVehiclesSchema = z.object({
  /** `TrackLeg.legIndex`: the leg in `Route.legs`. */
  legIndex: z.number().int().nonnegative(),
  line: z.string(),
  /** The leg's line/stops are not in the network; `vehicles` is then empty. */
  unknownLeg: z.boolean().optional(),
  /** The whole route of the line in the direction ridden, terminus to terminus, [lng, lat] (GTFS shape). */
  shape: z.array(z.tuple([z.number(), z.number()])).optional(),
  /** Ordered from the farthest ahead to the farthest behind. */
  vehicles: z.array(LiveVehicleSchema),
});
export type LegVehicles = z.infer<typeof LegVehiclesSchema>;

export const TrackVehiclesResponseSchema = z.object({
  /** ISO 8601 */
  generatedAt: z.string(),
  /** False when the API has no ZTM token: no live positions at all. */
  live: z.boolean(),
  /** ZTM did not answer; positions come from the last successful fetch. */
  stale: z.boolean(),
  refreshSec: z.number().positive(),
  legs: z.array(LegVehiclesSchema),
  /** Data credits that must be shown next to the vehicles. */
  attribution: z.array(z.string()),
});
export type TrackVehiclesResponse = z.infer<typeof TrackVehiclesResponseSchema>;

/**
 * Body for `POST /v1/vehicles/track` from a planned route: its tram and bus legs (walks have
 * no vehicle). Undefined for a route on foot only.
 */
export function trackRequestFromRoute(
  route: Pick<Route, "legs">,
): TrackVehiclesRequest | undefined {
  // Only tram and bus legs have vehicles; walks, bikes and cars do not.
  const legs = route.legs.flatMap((leg, legIndex) =>
    !isTransitMode(leg.mode)
      ? []
      : [
          {
            legIndex,
            line: leg.line,
            fromStopId: leg.fromStop.id,
            toStopId: leg.toStop.id,
            departAt: leg.departAt,
          },
        ],
  );
  return legs.length ? { legs } : undefined;
}
