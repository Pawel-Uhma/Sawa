import type { Route } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import {
  bearingDeg,
  GUIDE_MAX_M,
  guidePath,
  MIN_HEADING_MOVE_M,
  NO_HEADING,
  nextHeading,
} from "./navigation";

const stop = (id: string, lat: number, lng: number) => ({ id, name: id, position: { lat, lng } });

/** About 111 m per 0.001° of latitude: a straight ride north, 1.1 km long. */
const ROUTE: Route = {
  id: "r1",
  legs: [
    {
      line: "10",
      mode: "tram",
      headsign: "Północ",
      fromStop: stop("a", 52.23, 21.0),
      toStop: stop("b", 52.235, 21.0),
      departAt: "2026-10-17T14:00:00+02:00",
      durationMin: 3,
      lngLats: [
        [21.0, 52.23],
        [21.0, 52.235],
      ],
    },
    {
      line: "10",
      mode: "tram",
      headsign: "Północ",
      fromStop: stop("b", 52.235, 21.0),
      toStop: stop("c", 52.24, 21.0),
      departAt: "2026-10-17T14:03:00+02:00",
      durationMin: 3,
      lngLats: [
        [21.0, 52.235],
        [21.0, 52.24],
      ],
    },
  ],
  places: [
    {
      placeId: "p1",
      name: "P1",
      position: { lat: 52.232, lng: 21.0005 },
      etaSec: 60,
      windowSec: 60,
      legIndex: 0,
      distanceM: 30,
    },
  ],
  totalMin: 6,
  endsAtStart: false,
  attribution: [],
};

describe("bearingDeg", () => {
  it("measures clockwise from north", () => {
    expect(bearingDeg([21, 52], [21, 52.01])).toBeCloseTo(0);
    expect(bearingDeg([21, 52], [21.01, 52])).toBeCloseTo(90);
    expect(bearingDeg([21, 52], [21, 51.99])).toBeCloseTo(180);
    expect(bearingDeg([21, 52], [20.99, 52])).toBeCloseTo(270);
  });
});

describe("nextHeading", () => {
  it("takes the GPS course when the phone gives one", () => {
    expect(nextHeading(NO_HEADING, [21, 52], 370).heading).toBe(10);
  });

  it("ignores a NaN course and waits for a move", () => {
    const first = nextHeading(NO_HEADING, [21, 52], Number.NaN);
    expect(first.heading).toBeNull();
    const moved = nextHeading(first, [21, 52.001], null);
    expect(moved.heading).toBeCloseTo(0);
  });

  it("keeps the heading through GPS jitter shorter than the threshold", () => {
    const state = { anchor: [21, 52] as [number, number], heading: 90 };
    const jitterDeg = MIN_HEADING_MOVE_M / 2 / 110_540;
    expect(nextHeading(state, [21, 52 + jitterDeg])).toBe(state);
  });
});

describe("guidePath", () => {
  it("runs from the user's spot on the route to the next place ahead", () => {
    const line = guidePath(ROUTE, { lat: 52.2305, lng: 21.0002 });
    expect(line).not.toBeNull();
    const first = line?.[0];
    const last = line?.at(-1);
    expect(first?.[0]).toBeCloseTo(21.0);
    expect(first?.[1]).toBeCloseTo(52.2305, 5);
    expect(last?.[1]).toBeCloseTo(52.232, 5);
  });

  it("goes on along the next legs once the place is passed, capped in length", () => {
    const line = guidePath(ROUTE, { lat: 52.233, lng: 21.0 });
    const last = line?.at(-1);
    // 500 m north of the user, across the leg boundary at 52.235
    expect(last?.[1]).toBeCloseTo(52.233 + GUIDE_MAX_M / 110_540, 3);
    expect(line?.some(([, lat]) => lat === 52.235)).toBe(true);
  });

  it("gives nothing off the route or at its end", () => {
    expect(guidePath(ROUTE, { lat: 52.233, lng: 21.01 })).toBeNull();
    expect(guidePath(ROUTE, { lat: 52.24, lng: 21.0 })).toBeNull();
  });
});
