import type { Ride } from "./beam-search";

/** Moves everything after the walk by `sec` (e.g. the real first departure is later than assumed). */
export function shiftRide(ride: Ride, sec: number): Ride {
  if (sec === 0) return ride;
  return {
    ...ride,
    legs: ride.legs.map((l) => ({
      ...l,
      boardElapsedSec: l.boardElapsedSec + sec,
      alightElapsedSec: l.alightElapsedSec + sec,
    })),
    places: ride.places.map((p) => ({ ...p, etaSec: p.etaSec + sec })),
    elapsedSec: ride.elapsedSec + sec,
  };
}
