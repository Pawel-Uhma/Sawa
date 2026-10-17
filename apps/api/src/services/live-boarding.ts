import type { LiveBoardingSource } from "./ports";
import type { VehicleTracker } from "./track-vehicles";

/** Planning must not wait long for ZTM: without an answer the ride keeps the timetable. */
const LIVE_TIMEOUT_MS = 1_500;

/**
 * Live boarding times from the vehicle tracker: the vehicle it picks for the leg (`role: ride`)
 * and its predicted time at the boarding stop. Nothing when positions are stale or missing.
 */
export function createTrackerBoardingSource(
  tracker: VehicleTracker,
  timeoutMs = LIVE_TIMEOUT_MS,
): LiveBoardingSource {
  return {
    async boardAtMs(leg) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<undefined>((resolve) => {
        timer = setTimeout(() => resolve(undefined), timeoutMs);
      });
      try {
        const answer = await Promise.race([tracker.track({ legs: [leg] }), timeout]);
        if (!answer?.live || answer.stale) return undefined;
        const ride = answer.legs[0]?.vehicles.find((v) => v.role === "ride");
        return ride?.boardAt ? Date.parse(ride.boardAt) : undefined;
      } catch {
        return undefined;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
