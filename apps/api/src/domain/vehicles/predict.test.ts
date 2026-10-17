import { describe, expect, it } from "vitest";
import { GEOMETRY, NOW_MS, STOP_M, tram } from "./__fixtures__/line";
import { vehiclesOnPattern } from "./along";
import { alongAtTime, predictKnots, scheduledSecAt, timeAtAlong } from "./predict";

const on = (...trams: ReturnType<typeof tram>[]) => vehiclesOnPattern(trams, GEOMETRY, NOW_MS);
const S = 1000;

describe("timeAtAlong / alongAtTime", () => {
  const samples = [
    { atMs: 0, alongM: 0 },
    { atMs: 10_000, alongM: 100 },
    { atMs: 70_000, alongM: 100 },
    { atMs: 80_000, alongM: 200 },
  ];

  it("returns the first time a distance was reached, so a stop keeps its dwell", () => {
    expect(timeAtAlong(samples, 50)).toBe(5_000);
    expect(timeAtAlong(samples, 100)).toBe(10_000);
    expect(timeAtAlong(samples, 150)).toBe(75_000);
    expect(timeAtAlong(samples, 300)).toBeUndefined();
    expect(timeAtAlong(samples.slice(1), 50)).toBeUndefined();
  });

  it("interpolates the distance at a time and clamps outside the knots", () => {
    expect(alongAtTime(samples, 40_000)).toBe(100);
    expect(alongAtTime(samples, 75_000)).toBe(150);
    expect(alongAtTime(samples, -1)).toBe(0);
    expect(alongAtTime(samples, 999_000)).toBe(200);
  });
});

describe("scheduledSecAt", () => {
  it("interpolates GTFS times between stops", () => {
    expect(scheduledSecAt(GEOMETRY.pattern.stops, STOP_M * 1.5)).toBeCloseTo(90);
  });
});

describe("predictKnots", () => {
  it("copies how the vehicle ahead drove the stretch, jam included", () => {
    // The leader passed 300 m 5 min ago, then stood 2 min at 600 m (a jam) and went on.
    const leader = tram("lead", [
      [300, 300],
      [270, 600],
      [150, 600],
      [120, 900],
      [0, 2000],
    ]);
    const follower = tram("next", [
      [20, 200],
      [0, 300],
    ]);
    const vehicles = on(leader, follower);
    const me = vehicles.find((v) => v.history.id === "next");
    if (!me) throw new Error("follower not on the pattern");
    const { knots, source } = predictKnots(me, vehicles, GEOMETRY, NOW_MS + 200 * S);
    expect(source).toBe("leader");
    // Reaches the jam 30 s from now, stands there 2 min like the leader did.
    expect(alongAtTime(knots, NOW_MS + 30 * S)).toBeCloseTo(600, 0);
    expect(alongAtTime(knots, NOW_MS + 140 * S)).toBeCloseTo(600, 0);
    expect(alongAtTime(knots, NOW_MS + 180 * S)).toBeGreaterThan(900);
  });

  it("falls back to the timetable speed without a vehicle ahead", () => {
    const vehicles = on(
      tram("solo", [
        [20, STOP_M - 100],
        [0, STOP_M],
      ]),
    );
    const [me] = vehicles;
    if (!me) throw new Error("not on the pattern");
    const { knots, source } = predictKnots(me, vehicles, GEOMETRY, NOW_MS + 60 * S);
    expect(source).toBe("schedule");
    // One stop per 60 s in the fixture timetable.
    expect(alongAtTime(knots, NOW_MS + 60 * S)).toBeCloseTo(2 * STOP_M, 0);
  });

  it("predicts far enough to reach a given distance", () => {
    const vehicles = on(
      tram("solo", [
        [20, 0],
        [0, 50],
      ]),
    );
    const [me] = vehicles;
    if (!me) throw new Error("not on the pattern");
    const { knots } = predictKnots(me, vehicles, GEOMETRY, NOW_MS, 6 * STOP_M);
    expect(knots.at(-1)?.alongM).toBeGreaterThanOrEqual(6 * STOP_M - 1);
  });

  it("holds a vehicle waiting at the first stop", () => {
    const vehicles = on(
      tram("layover", [
        [60, 10],
        [0, 12],
      ]),
    );
    const [me] = vehicles;
    if (!me) throw new Error("not on the pattern");
    const { knots, source } = predictKnots(me, vehicles, GEOMETRY, NOW_MS + 60 * S);
    expect(source).toBe("hold");
    expect(alongAtTime(knots, NOW_MS + 60 * S)).toBeCloseTo(12, 0);
  });

  it("stops at the end of the pattern", () => {
    const end = GEOMETRY.lengthM;
    const vehicles = on(
      tram("last", [
        [20, end - 300],
        [0, end - 200],
      ]),
    );
    const [me] = vehicles;
    if (!me) throw new Error("not on the pattern");
    const { knots } = predictKnots(me, vehicles, GEOMETRY, NOW_MS + 600 * S);
    expect(alongAtTime(knots, NOW_MS + 600 * S)).toBeCloseTo(end, 0);
  });
});
