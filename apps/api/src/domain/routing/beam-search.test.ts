import { describe, expect, it } from "vitest";
import { ORIGIN_FAR_AWAY, PLACES, searchInput } from "./__fixtures__/synthetic";
import { planRide } from "./beam-search";

const linesOf = (
  input: ReturnType<typeof searchInput>,
  ride: NonNullable<ReturnType<typeof planRide>>,
) => ride.legs.map((l) => input.network.patterns.get(l.patternId)?.line);

describe("planRide", () => {
  it("fits the time budget within ±10%", () => {
    const ride = planRide(searchInput(PLACES, ["architecture"], 30));
    expect(ride).not.toBeNull();
    expect(ride?.elapsedSec).toBeGreaterThanOrEqual(0.9 * 30 * 60);
    expect(ride?.elapsedSec).toBeLessThanOrEqual(1.1 * 30 * 60);
  });

  it("uses at most two transfers", () => {
    const ride = planRide(searchInput(PLACES, ["war_uprising"], 60));
    expect(ride?.legs.length).toBeGreaterThan(0);
    expect(ride?.legs.length).toBeLessThanOrEqual(3);
  });

  it("follows the line with places matching the interests", () => {
    const war = searchInput(PLACES, ["war_uprising"], 30);
    const architecture = searchInput(PLACES, ["architecture"], 30);
    const warRide = planRide(war);
    const architectureRide = planRide(architecture);
    expect(warRide && linesOf(war, warRide)).toContain("B");
    expect(architectureRide && linesOf(architecture, architectureRide)).toEqual(["A"]);
    expect(warRide?.places.map((p) => p.placeId)).toEqual(
      expect.arrayContaining(["b-north-1", "b-north-2", "b-north-3"]),
    );
  });

  it("counts each place once even when two legs pass it", () => {
    const ride = planRide(searchInput(PLACES, ["war_uprising"], 30));
    const ids = ride?.places.map((p) => p.placeId) ?? [];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives place ETAs inside the leg that passes them", () => {
    const ride = planRide(searchInput(PLACES, ["war_uprising"], 30));
    for (const p of ride?.places ?? []) {
      const leg = ride?.legs[p.legIndex];
      expect(p.etaSec).toBeGreaterThanOrEqual(leg?.boardElapsedSec ?? Number.NaN);
      expect(p.etaSec).toBeLessThanOrEqual(leg?.alightElapsedSec ?? Number.NaN);
    }
  });

  it("is deterministic", () => {
    expect(planRide(searchInput(PLACES, ["architecture"], 45))).toEqual(
      planRide(searchInput(PLACES, ["architecture"], 45)),
    );
  });

  it("still returns a ride when there are no places", () => {
    const ride = planRide(searchInput([], ["architecture"], 30));
    expect(ride?.legs.length).toBeGreaterThan(0);
    expect(ride?.places).toEqual([]);
  });

  it("falls back to the longest ride when the lines are too short for the budget", () => {
    const ride = planRide(searchInput(PLACES, ["architecture"], 240));
    expect(ride?.legs.length).toBeGreaterThan(0);
    expect(ride?.elapsedSec).toBeLessThan(240 * 60);
  });

  it("returns null when no stop is near the origin", () => {
    expect(
      planRide({ ...searchInput(PLACES, ["architecture"], 30), origin: ORIGIN_FAR_AWAY }),
    ).toBeNull();
  });
});
