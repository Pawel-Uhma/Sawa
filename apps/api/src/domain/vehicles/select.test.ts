import { describe, expect, it } from "vitest";
import { pickAroundBoarding } from "./select";

const MIN = 60_000;
const candidates = [
  { id: "far-ahead", alongNowM: 3000, boardAtMs: -20 * MIN },
  { id: "ahead", alongNowM: 2000, boardAtMs: -8 * MIN },
  { id: "late", alongNowM: 800, boardAtMs: 3 * MIN },
  { id: "behind", alongNowM: 100, boardAtMs: 12 * MIN },
  { id: "unknown", alongNowM: 50 },
];

describe("pickAroundBoarding", () => {
  it("rides the vehicle at the stop closest to the planned departure, with its neighbours", () => {
    expect(pickAroundBoarding(candidates, 0, 15 * MIN)).toEqual({
      ride: "late",
      ahead: "ahead",
      behind: "behind",
    });
  });

  it("leaves a neighbour out when there is none", () => {
    expect(pickAroundBoarding(candidates, -21 * MIN, 15 * MIN)).toEqual({
      ride: "far-ahead",
      ahead: undefined,
      behind: "ahead",
    });
  });

  it("does not ride a vehicle that already left while the rider still waits", () => {
    expect(pickAroundBoarding(candidates, -7 * MIN, 15 * MIN, -MIN)?.ride).toBe("late");
  });

  it("picks nothing when no vehicle is within the tolerance", () => {
    expect(pickAroundBoarding(candidates, 60 * MIN, 15 * MIN)).toBeUndefined();
  });
});
