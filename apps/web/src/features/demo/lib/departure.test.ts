import { describe, expect, it } from "vitest";
import { departureLabel } from "./departure";

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
