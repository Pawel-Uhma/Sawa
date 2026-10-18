import { TrackVehiclesResponseSchema } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { createNetwork } from "../domain/routing/network";
import { NOW_MS, PATTERN, STOP_M, tram } from "../domain/vehicles/__fixtures__/line";
import type { VehicleReport } from "../domain/vehicles/types";
import { AppError } from "../lib/errors";
import type { TransitData, VehiclePositionSource } from "./ports";
import { createVehicleTracker } from "./track-vehicles";

const transit: TransitData = {
  network: createNetwork(
    PATTERN.stops.map((s, i) => ({
      id: s.stopId,
      groupId: s.stopId,
      name: s.stopId,
      position: { lat: 52.23, lng: 21 + i * 0.005 },
    })),
    [PATTERN],
  ),
  serviceDate: "2026-10-17",
  attribution: ["GTFS"],
};

/** Replays the fixture trams' samples as if ZTM served them at each poll. */
function replay(trams: ReturnType<typeof tram>[]) {
  let nowMs = 0;
  const source: VehiclePositionSource = {
    async positions() {
      return trams.flatMap((t) => {
        const s = t.samples.filter((x) => x.atMs <= nowMs).at(-1);
        if (!s) return [];
        const r: VehicleReport = { ...t, position: s.position, reportedAtMs: s.atMs };
        return [r];
      });
    },
  };
  return { source, setNow: (ms: number) => (nowMs = ms), clock: () => nowMs };
}

// Three trams 6 stops apart; the rider boards at S5 now.
const trams = [
  tram("tram-1", [
    [60, 7 * STOP_M],
    [30, 7.5 * STOP_M],
    [0, 8 * STOP_M],
  ]),
  tram("tram-2", [
    [60, 3 * STOP_M],
    [30, 3.5 * STOP_M],
    [0, 4 * STOP_M],
  ]),
  tram("tram-3", [
    [60, 0],
    [30, 0.2 * STOP_M],
    [0, 0.5 * STOP_M],
  ]),
  tram("tram-other-way", [
    [60, 6 * STOP_M],
    [30, 5.5 * STOP_M],
    [0, 5 * STOP_M],
  ]),
];
const legs = [
  {
    line: "9",
    fromStopId: "S5",
    toStopId: "S9",
    departAt: new Date(NOW_MS + 60_000).toISOString(),
  },
];

async function trackedAfterPolls(departAt = legs[0]?.departAt as string) {
  const { source, setNow, clock } = replay(trams);
  const tracker = createVehicleTracker({ source, transit, clock });
  for (const secAgo of [60, 30, 0]) {
    setNow(NOW_MS - secAgo * 1000);
    await tracker.track({ legs: [{ ...legs[0], departAt } as (typeof legs)[number]] });
  }
  return tracker.track({ legs: [{ ...legs[0], departAt } as (typeof legs)[number]] });
}

describe("createVehicleTracker", () => {
  it("returns the rider's vehicle with the one ahead and the one behind", async () => {
    const res = TrackVehiclesResponseSchema.parse(await trackedAfterPolls());
    expect(res.live).toBe(true);
    const vehicles = res.legs[0]?.vehicles ?? [];
    expect(vehicles.map((v) => [v.id, v.role])).toEqual([
      ["tram-1", "ahead"],
      ["tram-2", "ride"],
      ["tram-3", "behind"],
    ]);
    const ride = vehicles[1];
    expect(ride?.track.at(-1)?.[2]).toBe(NOW_MS + 120_000);
    expect(Date.parse(ride?.boardAt ?? "")).toBeGreaterThan(NOW_MS);
    // The whole route of the line, not only the stretch the tracks cover.
    expect(res.legs[0]?.shape?.length).toBeGreaterThanOrEqual(2);
  });

  it("marks a leg whose stops are not on the line", async () => {
    const tracker = createVehicleTracker({
      source: replay([]).source,
      transit,
      clock: () => NOW_MS,
    });
    const res = await tracker.track({
      legs: [{ ...legs[0], line: "999" } as (typeof legs)[number]],
    });
    expect(res.legs[0]).toEqual({ legIndex: 0, line: "999", unknownLeg: true, vehicles: [] });
  });

  it("serves the last positions with stale: true when ZTM fails", async () => {
    let fail = false;
    const { source, setNow, clock } = replay(trams);
    const flaky: VehiclePositionSource = {
      positions: () =>
        fail ? Promise.reject(new AppError("UPSTREAM_ERROR", "down")) : source.positions(),
    };
    const tracker = createVehicleTracker({ source: flaky, transit, clock });
    for (const secAgo of [60, 30]) {
      setNow(NOW_MS - secAgo * 1000);
      await tracker.track({ legs });
    }
    fail = true;
    setNow(NOW_MS);
    const res = await tracker.track({ legs });
    expect(res.stale).toBe(true);
    expect(res.legs[0]?.vehicles.length).toBeGreaterThan(0);
  });

  it("answers live: false without a ZTM source", async () => {
    const tracker = createVehicleTracker({ transit, clock: () => NOW_MS });
    const res = await tracker.track({ legs });
    expect(res.live).toBe(false);
    expect(res.legs[0]?.vehicles).toEqual([]);
  });
});
