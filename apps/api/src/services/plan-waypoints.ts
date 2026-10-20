import {
  haversineM,
  type LatLng,
  MIN_DURATION_MIN,
  type PlanRouteRequest,
  type Route,
} from "@sawa/shared";
import { joinRoutes, type WaypointStop } from "../domain/routing/join-routes";
import { STORY_GAP_SEC, STORY_MAX_SEC } from "../domain/routing/select-stories";
import { AppError } from "../lib/errors";
import type { RoutePlanner } from "./plan-route";

/** A waypoint closer than this to where its part starts is already reached: no part for it. */
const SAME_POINT_M = 30;
const WAYPOINT_NAME = "Przystanek";

/**
 * Plans through `request.waypoints` (issue #195): the fastest way to each one in order, then
 * the time left (`durationMin` minus the way so far) as a ride or walk past places to the end
 * (destination, start or anywhere); with no time left, the fastest way to the end. Each part
 * is planned from the moment the one before arrives. Without waypoints: `planner` as it is.
 */
export function withWaypoints(planner: RoutePlanner): RoutePlanner {
  /** Picked transit and no ride to a nearby waypoint: walking there is the only way. */
  async function planPart(request: PlanRouteRequest, now: Date): Promise<Route> {
    try {
      return await planner.plan(request, now);
    } catch (err) {
      const isNoRide = err instanceof AppError && err.code === "NOT_FOUND";
      if (!isNoRide || request.travel !== "transit" || request.durationMin !== undefined) throw err;
      return planner.plan({ ...request, travel: "walk" }, now);
    }
  }

  return {
    async plan(request, now) {
      const { waypoints = [], ...rest } = request;
      if (waypoints.length === 0) return planner.plan(request, now);
      // Parts are joined into one route: their alternatives (#197) would be thrown away.
      const base: PlanRouteRequest = { ...rest, routeCount: 1 };

      const at = (sec: number) => new Date(now.getTime() + sec * 1000);
      const stops: WaypointStop[] = waypoints.map((w) => ({
        position: { lat: w.lat, lng: w.lng },
        placeId: w.placeId,
        name: w.name ?? WAYPOINT_NAME,
      }));
      const parts: Route[] = [];
      const reached: WaypointStop[] = [];
      let from: LatLng = base.origin;
      let elapsedSec = 0;
      for (const stop of stops) {
        if (haversineM(from, stop.position) >= SAME_POINT_M) {
          const part = await planPart(
            {
              ...base,
              origin: from,
              destination: stop.position,
              durationMin: undefined,
              returnToStart: false,
            },
            at(elapsedSec),
          );
          parts.push(part);
          reached.push(stop);
          elapsedSec += part.totalMin * 60;
        } else if (parts.length > 0) {
          // Same point as the stop before: its story is told there too.
          reached[reached.length - 1] = stop;
        }
        from = stop.position;
      }

      const end = base.returnToStart ? base.origin : base.destination;
      const leftMin =
        base.durationMin === undefined ? 0 : Math.round(base.durationMin - elapsedSec / 60);
      const last: PlanRouteRequest | undefined =
        leftMin >= MIN_DURATION_MIN
          ? { ...base, origin: from, durationMin: leftMin, destination: end, returnToStart: false }
          : end && haversineM(from, end) >= SAME_POINT_M
            ? {
                ...base,
                origin: from,
                destination: end,
                durationMin: undefined,
                returnToStart: false,
              }
            : undefined;
      if (last) parts.push(await planPart(last, at(elapsedSec)));
      if (parts.length === 0) {
        // Every waypoint is at the start: plan as without them, if the request says how.
        if (base.durationMin === undefined && !base.destination)
          throw new AppError("VALIDATION", "Przystanek jest w miejscu startu");
        return planner.plan(rest, now);
      }

      return joinRoutes({
        parts,
        waypoints: reached,
        origin: base.origin,
        destination: base.destination,
        storyGapSec: base.storyStyle && STORY_GAP_SEC[base.storyStyle],
        storyMaxSec: base.storyStyle && STORY_MAX_SEC[base.storyStyle],
      });
    },
  };
}
