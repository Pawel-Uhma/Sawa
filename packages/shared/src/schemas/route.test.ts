import { describe, expect, it } from "vitest";
import { MAX_WAYPOINTS, PlanRouteRequestSchema } from "./route";

const base = { origin: { lat: 52.23, lng: 21.01 }, interests: ["historical"] };
const stop = { lat: 52.24, lng: 21.0, placeId: "kercelak", name: "Kercelak" };

describe("PlanRouteRequestSchema waypoints", () => {
  it("accepts a request without waypoints as before", () => {
    expect(PlanRouteRequestSchema.parse({ ...base, durationMin: 60 }).waypoints).toBeUndefined();
  });

  it("keeps the waypoints in the given order", () => {
    const second = { lat: 52.25, lng: 20.99 };
    const parsed = PlanRouteRequestSchema.parse({
      ...base,
      durationMin: 60,
      waypoints: [stop, second],
    });
    expect(parsed.waypoints).toEqual([stop, second]);
  });

  it("allows waypoints without a duration or destination (the fastest way through them)", () => {
    expect(PlanRouteRequestSchema.safeParse({ ...base, waypoints: [stop] }).success).toBe(true);
    expect(PlanRouteRequestSchema.safeParse({ ...base, waypoints: [] }).success).toBe(false);
  });

  it("rejects more than MAX_WAYPOINTS stops", () => {
    const waypoints = Array.from({ length: MAX_WAYPOINTS + 1 }, () => stop);
    expect(PlanRouteRequestSchema.safeParse({ ...base, durationMin: 60, waypoints }).success).toBe(
      false,
    );
  });
});
