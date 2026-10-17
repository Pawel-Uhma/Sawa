import type { Ride } from "./beam-search";
import { shiftRide } from "./shift-ride";

/**
 * Puts each leg on a real departure from its boarding stop, leg by leg: the first departure
 * after reaching the stop (walk for the first leg, alighting + `transferSec` for the next ones).
 * `departuresSec[i]` are the departures of leg i in seconds since the request; a leg without
 * them keeps the estimated wait and the legs after it follow from there.
 */
export function applyDepartures(
  ride: Ride,
  departuresSec: ReadonlyArray<readonly number[] | undefined>,
  transferSec: number,
): Ride {
  let out = ride;
  for (let i = 0; i < out.legs.length; i++) {
    const prev = out.legs[i - 1];
    const leg = out.legs[i];
    if (!leg) break;
    const atStopSec = prev
      ? prev.alightElapsedSec + transferSec + (leg.walkBeforeSec ?? 0)
      : out.walkSec;
    const real = departuresSec[i]
      ?.filter((s) => s >= atStopSec)
      .reduce((a, b) => Math.min(a, b), Number.POSITIVE_INFINITY);
    if (real === undefined || real === Number.POSITIVE_INFINITY) continue;
    out = shiftRide(out, real - leg.boardElapsedSec, i);
    out = {
      ...out,
      legs: out.legs.map((l, j) => (j === i ? { ...l, realDeparture: true } : l)),
    };
  }
  return out;
}
