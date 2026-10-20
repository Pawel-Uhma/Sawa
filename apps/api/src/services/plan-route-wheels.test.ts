import { type BikeStation, HACKATHON_VENUE, haversineM, RouteSchema } from "@sawa/shared";
import { describe, expect, it, vi } from "vitest";
import { loadTransitCalendar } from "../adapters/gtfs/load-transit";
import { createFilePlacesRepository } from "../adapters/places-file/file-places-repository";
import { createRoutePlanner } from "./plan-route";
import type { BikeStationSource, WalkPathSource } from "./ports";

// Integration test on the committed data files (real Warsaw network and places).
const transit = loadTransitCalendar(new URL("../../data/transit/", import.meta.url)).forDate(
  "2026-10-17",
);
const places = createFilePlacesRepository(new URL("../../data/places.geojson", import.meta.url));
const NOW = new Date("2026-10-17T14:00:00+02:00");
const KERCELAK = { lat: 52.2365, lng: 20.9845 };

const station = (id: string, lat: number, lng: number, bikes: number, docks: number) =>
  ({
    id,
    name: `Stacja ${id}`,
    position: { lat, lng },
    bikesAvailable: bikes,
    docksAvailable: docks,
  }) satisfies BikeStation;
const STATIONS = [
  station("venue", HACKATHON_VENUE.lat + 0.001, HACKATHON_VENUE.lng, 4, 6),
  station("kercelak", KERCELAK.lat + 0.001, KERCELAK.lng, 2, 8),
];
const stationSource = (stations: BikeStation[]): BikeStationSource => ({
  stations: vi.fn(async () => ({ stations, stale: false })),
});

describe("route planner by bike and car", () => {
  it("drives past places on one car leg, without trams or buses", async () => {
    const planner = createRoutePlanner({ transit, places });
    const route = RouteSchema.parse(
      await planner.plan(
        { origin: HACKATHON_VENUE, durationMin: 30, interests: ["historical"], travel: "car" },
        NOW,
      ),
    );
    expect(route.legs.map((l) => l.mode)).toEqual(["car"]);
    expect(route.places.length).toBeGreaterThanOrEqual(3);
    expect(route.totalMin).toBeLessThanOrEqual(33);
  });

  it("rides Veturilo from the station by the venue to the one by the destination", async () => {
    const bikeStations = stationSource(STATIONS);
    const planner = createRoutePlanner({ transit, places, bikeStations });
    const route = RouteSchema.parse(
      await planner.plan(
        {
          origin: HACKATHON_VENUE,
          destination: KERCELAK,
          durationMin: 20,
          interests: ["historical"],
          travel: "bike",
        },
        NOW,
      ),
    );
    expect(route.legs.map((l) => l.mode)).toEqual(["walk", "bike", "walk"]);
    expect(route.bikeStations?.pickup.id).toBe("venue");
    expect(route.bikeStations?.dropoff?.id).toBe("kercelak");
    expect(route.endsAtDestination).toBe(true);
  });

  it("takes the quickest bike ride to a destination without a duration", async () => {
    const planner = createRoutePlanner({ transit, places });
    const route = await planner.plan(
      { origin: HACKATHON_VENUE, destination: KERCELAK, interests: ["historical"], travel: "bike" },
      NOW,
    );
    expect(route.legs.map((l) => l.mode)).toEqual(["bike"]);
    // ~0.4 km at about 15 km/h, on foot it would be over 5 min
    expect(route.totalMin).toBeGreaterThan(1);
    expect(route.totalMin).toBeLessThan(4);
  });

  it("plans with one's own bike when the station feed fails", async () => {
    const bikeStations: BikeStationSource = {
      stations: async () => {
        throw new Error("GBFS down");
      },
    };
    const planner = createRoutePlanner({ transit, places, bikeStations });
    const route = await planner.plan(
      { origin: HACKATHON_VENUE, durationMin: 15, interests: ["historical"], travel: "bike" },
      NOW,
    );
    expect(route.legs.map((l) => l.mode)).toEqual(["bike"]);
    expect(route.bikeStations).toBeUndefined();
  });

  it("puts bike legs on the bike router and walks on the walking one", async () => {
    const path = (points: { lat: number; lng: number }[]) =>
      points.map((p) => [p.lng, p.lat] as [number, number]);
    const walkPaths: WalkPathSource = { path: vi.fn(async (points) => path(points)) };
    const bike: WalkPathSource = { path: vi.fn(async (points) => path(points)) };
    const planner = createRoutePlanner({
      transit,
      places,
      walkPaths,
      wheelPaths: { bike },
      bikeStations: stationSource(STATIONS),
    });
    await planner.plan(
      {
        origin: HACKATHON_VENUE,
        destination: KERCELAK,
        durationMin: 20,
        interests: ["historical"],
        travel: "bike",
      },
      NOW,
    );
    expect(bike.path).toHaveBeenCalledTimes(1);
    expect(walkPaths.path).toHaveBeenCalledTimes(2);
  });

  it("ends a car loop near the start", async () => {
    const planner = createRoutePlanner({ transit, places });
    const route = await planner.plan(
      {
        origin: HACKATHON_VENUE,
        durationMin: 20,
        interests: ["historical", "cultural"],
        returnToStart: true,
        travel: "car",
      },
      NOW,
    );
    const end = route.legs.at(-1)?.toStop.position;
    expect(route.endsAtStart).toBe(true);
    expect(end && haversineM(end, HACKATHON_VENUE)).toBeLessThan(500);
  });
});
