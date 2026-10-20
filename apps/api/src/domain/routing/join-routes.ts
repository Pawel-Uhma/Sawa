import { haversineM, type LatLng, MAX_STORY_SEC, type Route, type RoutePlace } from "@sawa/shared";
import { MIN_STORY_GAP_SEC, STORY_MAX_SEC, storyWindowSec } from "./select-stories";

/** Within this distance of the origin the joined route counts as a loop (as for walks). */
const AT_START_M = 500;

/** A stop on the way that a part of the route ends at (issue #195). */
export type WaypointStop = { position: LatLng; placeId?: string; name: string };

export type JoinRoutesInput = {
  /** Planned one after another; part `i` ends at `waypoints[i]` (the last part may end anywhere). */
  parts: Route[];
  waypoints: WaypointStop[];
  origin: LatLng;
  /** Requested destination, if any: `endsAtDestination` is taken from the last part. */
  destination?: LatLng;
  storyGapSec?: number;
  storyMaxSec?: number;
};

const roundMin = (sec: number) => Math.round(sec / 6) / 10;

/**
 * Parts of a route planned from stop to stop → one `Route`. Legs follow each other, places get
 * the time and legs of the parts before them, and a waypoint with a `placeId` is a place of the
 * route at the moment it is reached, even when its part did not pass it (it is the end of that
 * part). Places too close to a waypoint's story are dropped, so the waypoint is told.
 */
export function joinRoutes({
  parts,
  waypoints,
  origin,
  destination,
  storyGapSec = MIN_STORY_GAP_SEC,
  storyMaxSec = STORY_MAX_SEC.fun,
}: JoinRoutesInput): Route {
  let offsetSec = 0;
  let legOffset = 0;
  const places: RoutePlace[] = [];
  const told: RoutePlace[] = [];
  const legs = parts.flatMap((part, i) => {
    for (const p of part.places)
      places.push({ ...p, etaSec: p.etaSec + offsetSec, legIndex: p.legIndex + legOffset });
    offsetSec += part.totalMin * 60;
    legOffset += part.legs.length;
    const stop = waypoints[i];
    if (stop?.placeId)
      told.push({
        placeId: stop.placeId,
        name: stop.name,
        position: stop.position,
        etaSec: Math.round(offsetSec),
        windowSec: 0,
        legIndex: Math.max(0, legOffset - 1),
        distanceM: 0,
      });
    return part.legs.map((leg, j) => ({
      ...leg,
      // The ends of the parts in between are the waypoints, not "Start" and "Cel".
      fromStop:
        j === 0 && i > 0 && waypoints[i - 1] ? named(leg.fromStop, waypoints[i - 1]) : leg.fromStop,
      toStop: j === part.legs.length - 1 && stop ? named(leg.toStop, stop) : leg.toStop,
    }));
  });

  const toldIds = new Set(told.map((p) => p.placeId));
  const crowded = (p: RoutePlace) => told.some((w) => Math.abs(w.etaSec - p.etaSec) < storyGapSec);
  const seen = new Set<string>();
  const kept = [...told, ...places.filter((p) => !toldIds.has(p.placeId) && !crowded(p))]
    .filter((p) => !seen.has(p.placeId) && seen.add(p.placeId))
    .sort((a, b) => a.etaSec - b.etaSec);
  const withWindows = kept.map((p, i) => {
    const untilNextSec = (kept[i + 1]?.etaSec ?? offsetSec) - p.etaSec;
    const windowSec = toldIds.has(p.placeId)
      ? storyWindowSec(untilNextSec, storyGapSec, storyMaxSec)
      : Math.min(p.windowSec, Math.max(storyGapSec, Math.round(untilNextSec)));
    return { ...p, windowSec: Math.min(MAX_STORY_SEC, windowSec) };
  });

  const last = parts[parts.length - 1];
  const end = legs[legs.length - 1]?.toStop.position;
  return {
    id: parts.map((p) => p.id).join("+"),
    legs,
    places: withWindows,
    totalMin: roundMin(offsetSec),
    endsAtStart: !!end && haversineM(end, origin) <= AT_START_M,
    ...(destination ? { endsAtDestination: last?.endsAtDestination ?? false } : {}),
    attribution: [...new Set(parts.flatMap((p) => p.attribution))],
  };
}

/** Only the bare points ("start", "end"); a tram or bus stop keeps its own name. */
function named<T extends { id: string; name: string }>(stop: T, waypoint: WaypointStop): T {
  return stop.id === "start" || stop.id === "end" ? { ...stop, name: waypoint.name } : stop;
}
