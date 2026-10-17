import { describe, expect, it } from "vitest";
import { applyDepartures } from "./apply-departures";
import type { Ride } from "./beam-search";

// Walk 100 s, leg 0 boards at 400 (half headway 300), leg 1 boards after a transfer.
const RIDE: Ride = {
  originStopId: "A",
  walkSec: 100,
  legs: [
    {
      patternId: "p1",
      boardIndex: 0,
      alightIndex: 3,
      boardElapsedSec: 400,
      alightElapsedSec: 1000,
    },
    {
      patternId: "p2",
      boardIndex: 1,
      alightIndex: 4,
      boardElapsedSec: 1420,
      alightElapsedSec: 2000,
    },
  ],
  places: [
    { placeId: "x", etaSec: 700, distanceM: 50, legIndex: 0, score: 1 },
    { placeId: "y", etaSec: 1700, distanceM: 50, legIndex: 1, score: 1 },
  ],
  elapsedSec: 2000,
  score: 2,
  endsAtStart: false,
};

describe("applyDepartures", () => {
  it("keeps the ride when no departures are known", () => {
    expect(applyDepartures(RIDE, [undefined, undefined], 120)).toEqual(RIDE);
  });

  it("boards the first departure after reaching the stop", () => {
    const ride = applyDepartures(RIDE, [[50, 160, 900], undefined], 120);
    expect(ride.legs[0]).toMatchObject({
      boardElapsedSec: 160,
      alightElapsedSec: 760,
      realDeparture: true,
    });
    expect(ride.legs[1]).toMatchObject({ boardElapsedSec: 1180 });
    expect(ride.legs[1]?.realDeparture).toBeUndefined();
    expect(ride.places.map((p) => p.etaSec)).toEqual([460, 1460]);
    expect(ride.elapsedSec).toBe(1760);
  });

  it("times the transfer from the real arrival of the previous leg", () => {
    // Leg 0 shifted to 160 → arrives at 760, ready at 880; first departure after that is 1300.
    const ride = applyDepartures(RIDE, [[160], [700, 1300, 1600]], 120);
    expect(ride.legs[1]).toMatchObject({
      boardElapsedSec: 1300,
      alightElapsedSec: 1880,
      realDeparture: true,
    });
    expect(ride.places[1]?.etaSec).toBe(1580);
    expect(ride.elapsedSec).toBe(1880);
  });

  it("keeps the estimate when every departure is before reaching the stop", () => {
    const ride = applyDepartures(RIDE, [[10, 90], undefined], 120);
    expect(ride.legs[0]?.boardElapsedSec).toBe(400);
    expect(ride.legs[0]?.realDeparture).toBeUndefined();
  });
});
