import { type BikeStation, haversineM, RouteSchema } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { place } from "./__fixtures__/synthetic";
import { wheelStoryTimes } from "./travel-modes";
import type { PlacePoint } from "./types";
import { placesAlong } from "./walk-tour";
import { planWheelTour, VETURILO_CREDIT, type WheelTourInput } from "./wheel-tour";

const ORIGIN = { lat: 52.23, lng: 21.0 };
const DESTINATION = { lat: 52.23, lng: 21.03 }; // ~2 km east
const NOW = new Date("2026-10-17T12:00:00Z");
// ~70 m per 0.001° of longitude and ~111 m per 0.001° of latitude here.
const PLACES: PlacePoint[] = [
  place("by-road", 21.01, 52.2304, ["historical"]), // ~45 m off the straight way east
  place("on-road", 21.02, 52.23, ["historical"]),
  place("north", 21.005, 52.236, ["historical"]),
  place("east", 21.04, 52.231, ["historical"]),
];

const station = (
  id: string,
  lng: number,
  lat: number,
  bikesAvailable: number,
  docksAvailable: number,
): BikeStation => ({
  id,
  name: `Stacja ${id}`,
  position: { lat, lng },
  bikesAvailable,
  docksAvailable,
});

const STATIONS = [
  station("near-start", 21.0014, 52.2301, 3, 2), // ~100 m from the origin
  station("empty", 21.0004, 52.23, 0, 9), // closer, but no bike
  station("near-end", 21.0286, 52.2301, 5, 4), // ~100 m from the destination
  station("full", 21.0298, 52.23, 6, 0), // closer to the destination, but no dock
];

const input = (over: Partial<WheelTourInput>): WheelTourInput => ({
  mode: "car",
  places: PLACES,
  placesById: new Map(PLACES.map((p) => [p.id, p])),
  origin: ORIGIN,
  interests: new Set(["historical"]),
  now: NOW,
  attribution: ["GTFS"],
  ...over,
});

describe("planWheelTour", () => {
  it("drives one car leg past places within the time", () => {
    const route = RouteSchema.parse(planWheelTour(input({ budgetSec: 10 * 60 })));
    expect(route.legs.map((l) => l.mode)).toEqual(["car"]);
    expect(route.legs[0]?.line).toBe("");
    expect(route.places.length).toBeGreaterThan(0);
    expect(route.totalMin).toBeLessThanOrEqual(11);
    expect(route.bikeStations).toBeUndefined();
  });

  it("counts places farther off the road from a car than on foot", () => {
    const route = planWheelTour(input({ end: DESTINATION, destination: DESTINATION }));
    expect(route?.places.map((p) => p.placeId)).toContain("by-road");
    expect(route?.endsAtDestination).toBe(true);
    const onFoot = placesAlong(
      PLACES,
      { from: ORIGIN, to: DESTINATION, startSec: 0, sec: 1 },
      { interests: new Set(["historical"]) },
    );
    expect(onFoot.map((p) => p.placeId)).not.toContain("by-road");
  });

  it("walks to a Veturilo station with bikes, rides to one with docks and walks on", () => {
    const route = RouteSchema.parse(
      planWheelTour(
        input({ mode: "bike", end: DESTINATION, destination: DESTINATION, stations: STATIONS }),
      ),
    );
    expect(route.legs.map((l) => l.mode)).toEqual(["walk", "bike", "walk"]);
    expect(route.legs[1]?.fromStop.id).toBe("veturilo-near-start");
    expect(route.legs[1]?.toStop.id).toBe("veturilo-near-end");
    expect(route.bikeStations?.pickup).toMatchObject({ id: "near-start", bikesAvailable: 3 });
    expect(route.bikeStations?.dropoff).toMatchObject({ id: "near-end", docksAvailable: 4 });
    expect(route.attribution).toEqual(["GTFS", VETURILO_CREDIT]);
    expect(route.endsAtDestination).toBe(true);
    // Each leg starts when the previous one ends.
    const [walkIn, ride] = route.legs;
    expect(Date.parse(ride?.departAt ?? "")).toBeGreaterThan(Date.parse(walkIn?.departAt ?? ""));
  });

  it("brings a free bike tour back to the station nearest its end", () => {
    const route = planWheelTour(input({ mode: "bike", budgetSec: 15 * 60, stations: STATIONS }));
    const last = route?.legs.at(-1);
    expect(last?.mode).toBe("bike");
    expect(last?.toStop.id).toMatch(/^veturilo-/);
    expect(route?.bikeStations?.dropoff).toBeDefined();
  });

  it("rides one's own bike when no station near the start has a bike", () => {
    const far = [station("far", 21.05, 52.25, 5, 5)];
    const route = planWheelTour(input({ mode: "bike", budgetSec: 10 * 60, stations: far }));
    expect(route?.legs.map((l) => l.mode)).toEqual(["bike"]);
    expect(route?.bikeStations).toBeUndefined();
    expect(route?.attribution).toEqual(["GTFS"]);
  });

  it("ends a bike loop back near the start", () => {
    const route = planWheelTour(
      input({ mode: "bike", budgetSec: 20 * 60, end: ORIGIN, stations: STATIONS }),
    );
    expect(route?.endsAtStart).toBe(true);
    const end = route?.legs.at(-1)?.toStop.position;
    expect(end && haversineM(end, ORIGIN)).toBeLessThan(500);
  });

  it("spaces stories by the car's shorter gap", () => {
    const route = planWheelTour(input({ budgetSec: 15 * 60, styleGapSec: 45, styleMaxSec: 120 }));
    const { storyGapSec, storyMaxSec } = wheelStoryTimes("car", 45, 120);
    const places = route?.places ?? [];
    for (let i = 1; i < places.length; i++) {
      expect((places[i]?.etaSec ?? 0) - (places[i - 1]?.etaSec ?? 0)).toBeGreaterThanOrEqual(
        storyGapSec - 1,
      );
    }
    for (const p of places) expect(p.windowSec).toBeLessThanOrEqual(storyMaxSec);
  });
});
