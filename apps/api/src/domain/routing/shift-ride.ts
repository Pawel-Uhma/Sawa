import type { Ride } from "./beam-search";

/**
 * Moves legs from `fromLeg` on (and the places seen from them) by `sec`,
 * e.g. the real departure is later than the assumed half-headway wait.
 */
export function shiftRide(ride: Ride, sec: number, fromLeg = 0): Ride {
  if (sec === 0) return ride;
  return {
    ...ride,
    legs: ride.legs.map((l, i) =>
      i < fromLeg
        ? l
        : {
            ...l,
            boardElapsedSec: l.boardElapsedSec + sec,
            alightElapsedSec: l.alightElapsedSec + sec,
          },
    ),
    places: ride.places.map((p) => (p.legIndex < fromLeg ? p : { ...p, etaSec: p.etaSec + sec })),
    elapsedSec: ride.elapsedSec + sec,
  };
}
