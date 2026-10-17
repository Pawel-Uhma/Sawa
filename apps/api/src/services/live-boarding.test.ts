import type { LiveVehicle, TrackVehiclesResponse } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { createTrackerBoardingSource } from "./live-boarding";
import type { VehicleTracker } from "./track-vehicles";

const LEG = {
  line: "106",
  fromStopId: "500401",
  toStopId: "706701",
  departAt: "2026-10-17T15:09:00Z",
};

const vehicle = (role: LiveVehicle["role"], boardAt?: string) =>
  ({ role, ...(boardAt ? { boardAt } : {}) }) as LiveVehicle;

function tracker(answer: Partial<TrackVehiclesResponse>, delayMs = 0): VehicleTracker {
  const response = {
    generatedAt: "2026-10-17T15:00:00Z",
    live: true,
    stale: false,
    refreshSec: 10,
    legs: [],
    attribution: [],
    ...answer,
  } as TrackVehiclesResponse;
  return {
    track: () => new Promise((resolve) => setTimeout(() => resolve(response), delayMs)),
    start() {},
    stop() {},
  };
}

describe("createTrackerBoardingSource", () => {
  it("gives the boarding time of the vehicle the rider takes", async () => {
    const legs = [
      {
        legIndex: 0,
        line: "106",
        vehicles: [
          vehicle("ahead", "2026-10-17T15:01:00Z"),
          vehicle("ride", "2026-10-17T15:12:00Z"),
        ],
      },
    ];
    const source = createTrackerBoardingSource(tracker({ legs }));
    expect(await source.boardAtMs(LEG)).toBe(Date.parse("2026-10-17T15:12:00Z"));
  });

  it.each([
    ["no token", { live: false }],
    ["stale positions", { stale: true }],
    ["no vehicle to ride", { legs: [{ legIndex: 0, line: "106", vehicles: [vehicle("behind")] }] }],
  ])("gives nothing with %s", async (_, answer) => {
    expect(await createTrackerBoardingSource(tracker(answer)).boardAtMs(LEG)).toBeUndefined();
  });

  it("gives up when the tracker is too slow", async () => {
    const source = createTrackerBoardingSource(tracker({}, 200), 20);
    expect(await source.boardAtMs(LEG)).toBeUndefined();
  });
});
