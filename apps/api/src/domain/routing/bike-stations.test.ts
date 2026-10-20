import type { BikeStation } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { nearestStation } from "./bike-stations";

const at = { lat: 52.23, lng: 21.0 };
const station = (id: string, lng: number, bikes: number, docks: number): BikeStation => ({
  id,
  name: id,
  position: { lat: 52.23, lng },
  bikesAvailable: bikes,
  docksAvailable: docks,
});
const STATIONS = [
  station("next-door", 21.0005, 0, 10), // ~35 m, no bike
  station("close", 21.002, 2, 0), // ~140 m, no dock
  station("farther", 21.004, 1, 3), // ~275 m
];

describe("nearestStation", () => {
  it("takes the closest station with a bike to rent", () => {
    expect(nearestStation(STATIONS, at, "bike", 800)?.id).toBe("close");
  });

  it("takes the closest station with a free dock", () => {
    expect(nearestStation(STATIONS, at, "dock", 800)?.id).toBe("next-door");
  });

  it("finds none farther than the limit", () => {
    expect(nearestStation(STATIONS, at, "bike", 100)).toBeUndefined();
    expect(nearestStation([], at, "dock", 800)).toBeUndefined();
  });
});
