import { describe, expect, it } from "vitest";
import { fromLngLat, HACKATHON_VENUE, haversineM, toLngLat } from "./geo";

describe("haversineM", () => {
  it("returns 0 for the same point", () => {
    expect(haversineM(HACKATHON_VENUE, HACKATHON_VENUE)).toBe(0);
  });

  it("measures the venue to Kercelak at roughly 150 m", () => {
    const kercelak = { lat: 52.237, lng: 20.9802 };
    expect(haversineM(HACKATHON_VENUE, kercelak)).toBeGreaterThan(130);
    expect(haversineM(HACKATHON_VENUE, kercelak)).toBeLessThan(170);
  });
});

describe("toLngLat / fromLngLat", () => {
  it("swaps the order and round-trips", () => {
    expect(toLngLat(HACKATHON_VENUE)).toEqual([20.9789, 52.2359]);
    expect(fromLngLat(toLngLat(HACKATHON_VENUE))).toEqual(HACKATHON_VENUE);
  });
});
