import { haversineM, type LatLng } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { ORIGIN_NEAR_A0, PLACES, searchInput } from "./__fixtures__/synthetic";
import { planRide } from "./beam-search";

/**
 * Tram A stops ~270 m apart, so next to one stop the neighbouring ones are still within walking
 * distance. Walking to a neighbour to board the same tram (on, or back past the origin), or
 * getting off one stop early and walking the rest, only fills the budget with a walk.
 */
const ORIGIN_NEAR_A5 = { lat: 52.2301, lng: 21.02 };
const DESTINATION = { lat: 52.23, lng: 21.06 };
const budgets = Array.from({ length: 15 }, (_, i) => 20 + i * 5);
const ends = {
  free: () => ({}),
  loop: () => ({ returnToStart: true }),
  destination: () => ({ destination: DESTINATION }),
};
const cases = [ORIGIN_NEAR_A0, ORIGIN_NEAR_A5].flatMap((origin, o) =>
  Object.entries(ends).flatMap(([end, extra]) =>
    budgets.map((min) => [`A${o * 5}`, end, min, origin, extra()] as const),
  ),
);

function plan(budgetMin: number, origin: LatLng, extra: object) {
  const input = { ...searchInput(PLACES, ["architecture"], budgetMin), origin, ...extra };
  return { input, ride: planRide(input) };
}

type Input = ReturnType<typeof plan>["input"];
const walkM = (input: Input, point: LatLng, stopId: string | undefined) => {
  const p = input.network.stops.get(stopId ?? "")?.position;
  return p ? haversineM(point, p) : Number.POSITIVE_INFINITY;
};

describe("planRide walks", () => {
  it.each(
    cases,
  )("boards a line at its stop closest to the origin (near %s, %s, %i min)", (_, _end, budgetMin, origin, extra) => {
    const { input, ride } = plan(budgetMin, origin, extra);
    const leg = ride?.legs[0];
    const pattern = leg && input.network.patterns.get(leg.patternId);
    expect(pattern).toBeDefined();
    const boardWalk = walkM(input, origin, pattern?.stops[leg?.boardIndex ?? 0]?.stopId);
    const closer = pattern?.stops
      .slice(0, -1)
      .some((s) => walkM(input, origin, s.stopId) < boardWalk);
    expect(closer).toBe(false);
  });

  it.each(
    cases.filter(([, end]) => end !== "free"),
  )("gets off at the stop closest to the end (near %s, %s, %i min)", (_, end, budgetMin, origin, extra) => {
    const { input, ride } = plan(budgetMin, origin, extra);
    const point = end === "loop" ? origin : DESTINATION;
    const leg = ride?.legs[ride.legs.length - 1];
    const pattern = leg && input.network.patterns.get(leg.patternId);
    expect(pattern).toBeDefined();
    const alightWalk = walkM(input, point, pattern?.stops[leg?.alightIndex ?? 0]?.stopId);
    const closerLater = pattern?.stops
      .slice((leg?.alightIndex ?? 0) + 1)
      .some((s) => walkM(input, point, s.stopId) < alightWalk);
    expect(closerLater).toBe(false);
  });
});
