import type { Leg } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { departureLabel, rideStops } from "./departure";

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
