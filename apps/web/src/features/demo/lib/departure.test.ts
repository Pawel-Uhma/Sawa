import type { Leg } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { departureLabel, rideProgress, rideStartMs, rideStops, stepSpan } from "./departure";

// 14:02 UTC = 16:02 w Warszawie (CEST)
const AT = "2026-10-17T14:02:00.000Z";

describe("departureLabel", () => {
  it("shows a timetable departure as a plain time", () => {
    expect(departureLabel({ departAt: AT, realDeparture: true })).toEqual({
      time: "16:02",
      delay: null,
      isLate: false,
    });
  });

  it("marks an estimated departure with „ok.”", () => {
    expect(departureLabel({ departAt: AT }).time).toBe("ok. 16:02");
  });

  it("shows a live delay in whole minutes", () => {
    expect(departureLabel({ departAt: AT, realDeparture: true, delaySec: 230 })).toMatchObject({
      delay: "+4 min",
      isLate: true,
    });
    expect(departureLabel({ departAt: AT, realDeparture: true, delaySec: -120 }).delay).toBe(
      "2 min wcześniej",
    );
    expect(departureLabel({ departAt: AT, realDeparture: true, delaySec: 20 }).delay).toBe(
      "na czas",
    );
  });
});

describe("rideStops", () => {
  const stop = (id: string) => ({ id, name: id, position: { lat: 52, lng: 21 } });
  const ride = (
    from: string,
    to: string,
    passed: string[],
    departAt: string,
    line = "122",
  ): Leg => ({
    line,
    mode: "bus",
    headsign: "x",
    fromStop: stop(from),
    toStop: stop(to),
    departAt,
    durationMin: 4,
    stops: passed.map((id, i) => ({ ...stop(id), at: `2026-10-17T14:0${i + 1}:00.000Z` })),
    lngLats: [],
  });

  it("lists the stops of the whole ride on one line and marks where to get off", () => {
    const legs = [
      ride("A", "C", ["B"], "2026-10-17T14:00:00.000Z"),
      ride("C", "E", ["D"], "2026-10-17T14:04:00.000Z"),
      ride("E", "F", [], "2026-10-17T14:08:00.000Z", "15"),
    ];
    const stops = rideStops(legs, 0);
    expect(stops.map((s) => s.name)).toEqual(["B", "C", "D", "E"]);
    expect(stops.map((s) => s.isLast)).toEqual([false, false, false, true]);
    expect(rideStops(legs, 2).map((s) => s.name)).toEqual(["F"]);
  });

  it("ends the alighting stop at departure plus the ride time", () => {
    const [last] = rideStops([ride("A", "B", [], "2026-10-17T14:00:00.000Z")], 0);
    expect(last?.at).toBe("2026-10-17T14:04:00.000Z");
  });
});

describe("ride progress", () => {
  const stop = (id: string) => ({ id, name: id, position: { lat: 52, lng: 21 } });
  const T = (min: number) => `2026-10-17T14:${String(min).padStart(2, "0")}:00.000Z`;
  const ms = (min: number) => Date.parse(T(min));
  const walk: Leg = {
    line: "",
    mode: "walk",
    headsign: "A",
    fromStop: stop("start"),
    toStop: stop("A"),
    departAt: T(0),
    durationMin: 5,
    lngLats: [],
  };
  // A 14:10 → B 14:12 → C 14:14 (wysiadka)
  const ride: Leg = {
    line: "122",
    mode: "bus",
    headsign: "x",
    fromStop: stop("A"),
    toStop: stop("C"),
    departAt: T(10),
    durationMin: 4,
    stops: [{ ...stop("B"), at: T(12) }],
    lngLats: [],
  };
  const legs = [walk, ride];

  it("starts the ride clock at the first walk, else from the total time", () => {
    expect(rideStartMs(legs, 14)).toBe(ms(0));
    expect(rideStartMs([ride], 20)).toBe(ms(14) - 20 * 60_000);
  });

  it("spans a ride from boarding to getting off", () => {
    expect(stepSpan(legs, 1)).toEqual({ startMs: ms(10), endMs: ms(14) });
    expect(stepSpan(legs, 0)).toEqual({ startMs: ms(0), endMs: ms(5) });
  });

  it("puts the dot between stops in proportion to the time, none before or after", () => {
    expect(rideProgress(legs, 1, ms(9)).dot).toBeNull();
    expect(rideProgress(legs, 1, ms(11))).toEqual({ passed: 0, dot: { from: 0, frac: 0.5 } });
    expect(rideProgress(legs, 1, ms(13))).toEqual({ passed: 1, dot: { from: 1, frac: 0.5 } });
    expect(rideProgress(legs, 1, ms(15))).toEqual({ passed: 2, dot: null });
  });
});
