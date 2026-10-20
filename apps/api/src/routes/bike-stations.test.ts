import { ApiErrorSchema, BikeStationsResponseSchema } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { createFakeRoutePlanner } from "../services/fake-route-planner";
import type { BikeStationSource } from "../services/ports";

const STATION = {
  id: "203610",
  name: "Koneser",
  position: { lat: 52.25602, lng: 21.046219 },
  bikesAvailable: 3,
  docksAvailable: 7,
};

const appWith = (bikeStations?: BikeStationSource) =>
  createApp({
    corsOrigins: [],
    services: { routePlanner: createFakeRoutePlanner(), bikeStations },
  });

describe("GET /v1/bike-stations", () => {
  it("returns the stations matching the contract", async () => {
    const app = appWith({ stations: async () => ({ stations: [STATION], stale: true }) });
    const res = await app.request("/v1/bike-stations");
    expect(res.status).toBe(200);
    const body = BikeStationsResponseSchema.parse(await res.json());
    expect(body.stations).toEqual([STATION]);
    expect(body.stale).toBe(true);
    expect(body.attribution.length).toBeGreaterThan(0);
  });

  it("answers UPSTREAM_ERROR without a station source", async () => {
    const res = await appWith().request("/v1/bike-stations");
    expect(res.status).toBe(502);
    expect(ApiErrorSchema.parse(await res.json()).error.code).toBe("UPSTREAM_ERROR");
  });
});
