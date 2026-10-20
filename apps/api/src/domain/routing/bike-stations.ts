import { type BikeStation, haversineM, type LatLng } from "@sawa/shared";

/** Farthest walk to a Veturilo station worth taking; farther, the planner rides one's own bike. */
export const MAX_STATION_WALK_M = 800;
/** Farthest a station to leave the bike at may be from where the ride ends. */
export const MAX_DROPOFF_WALK_M = 2_000;

/**
 * The station closest to `point` that has a bike to rent (`need` "bike") or a free dock
 * (`need` "dock"), within `maxM`; undefined when there is none.
 */
export function nearestStation(
  stations: readonly BikeStation[],
  point: LatLng,
  need: "bike" | "dock",
  maxM: number,
): BikeStation | undefined {
  let best: { station: BikeStation; distanceM: number } | undefined;
  for (const station of stations) {
    const count = need === "bike" ? station.bikesAvailable : station.docksAvailable;
    if (count <= 0) continue;
    const distanceM = haversineM(point, station.position);
    if (distanceM > maxM) continue;
    if (
      !best ||
      distanceM < best.distanceM ||
      (distanceM === best.distanceM && station.id < best.station.id)
    )
      best = { station, distanceM };
  }
  return best?.station;
}
