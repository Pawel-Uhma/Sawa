import type { BikeStation, Leg, Route } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { bikeStationsToGeoJson, hasBikeLeg, polishPlural, stationLabel } from "./bike-stations";

const station = (id: string, bikes: number, docks: number): BikeStation => ({
  id,
  name: `Stacja ${id}`,
  position: { lat: 52.23, lng: 21 },
  bikesAvailable: bikes,
  docksAvailable: docks,
});
const leg = (mode: Leg["mode"]): Leg => ({
  line: "",
  mode,
  headsign: "x",
  fromStop: { id: "a", name: "a", position: { lat: 52.23, lng: 21 } },
  toStop: { id: "b", name: "b", position: { lat: 52.24, lng: 21 } },
  departAt: "2026-10-17T14:00:00.000Z",
  durationMin: 5,
  lngLats: [],
});
const ROUTE: Route = {
  id: "bike",
  legs: [leg("walk"), leg("bike"), leg("walk")],
  places: [],
  totalMin: 15,
  endsAtStart: false,
  attribution: [],
  bikeStations: { pickup: station("start", 4, 2), dropoff: station("end", 1, 6) },
};

describe("bike stations on the map", () => {
  it("picks the Polish plural", () => {
    expect([1, 2, 4, 5, 12, 22, 25].map((n) => polishPlural(n, "a", "b", "c"))).toEqual([
      "a",
      "b",
      "b",
      "c",
      "c",
      "b",
      "c",
    ]);
  });

  it("labels the pickup with bikes and the drop-off with free docks", () => {
    expect(stationLabel("pickup", station("x", 4, 0), "pl")).toBe("Weź rower · 4 rowery");
    expect(stationLabel("dropoff", station("x", 0, 6), "pl")).toBe(
      "Oddaj rower · 6 wolnych miejsc",
    );
    expect(stationLabel("dropoff", station("x", 0, 1), "en")).toBe("Return the bike · 1 free dock");
  });

  it("shows only routes with a bike leg", () => {
    expect(hasBikeLeg(ROUTE)).toBe(true);
    expect(hasBikeLeg({ ...ROUTE, legs: [leg("car")] })).toBe(false);
    expect(hasBikeLeg(undefined)).toBe(false);
  });

  it("marks the route's stations, with live counts when the list has them", () => {
    const live = [station("start", 7, 0), station("other", 3, 3)];
    const features = bikeStationsToGeoJson(ROUTE, live, "pl").features.map((f) => f.properties);
    expect(features.map((p) => [p.id, p.role])).toEqual([
      ["start", "pickup"],
      ["other", "other"],
      ["end", "dropoff"],
    ]);
    expect(features[0]?.label).toBe("Weź rower · 7 rowerów");
    expect(features[1]?.label).toBe("");
    expect(features[2]?.label).toBe("Oddaj rower · 6 wolnych miejsc");
  });
});
