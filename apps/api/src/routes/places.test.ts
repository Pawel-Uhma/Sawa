import { ApiErrorSchema, interestsOfTags, PlaceSchema, PlacesResponseSchema } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { AppError } from "../lib/errors";
import { createFakeRoutePlanner } from "../services/fake-route-planner";
import type { PlacesRepository } from "../services/ports";

const app = createApp({ corsOrigins: [], services: { routePlanner: createFakeRoutePlanner() } });
const AROUND_VENUE = "20.97,52.23,20.99,52.24";

describe("GET /v1/places", () => {
  it("returns a GeoJSON source matching the contract, with [lng, lat]", async () => {
    const res = await app.request(`/v1/places?bbox=${AROUND_VENUE}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("max-age");
    const body = PlacesResponseSchema.parse(await res.json());
    expect(body.features).toHaveLength(5);
    const kercelak = body.features.find((f) => f.properties.id === "kercelak");
    expect(kercelak?.geometry.coordinates).toEqual([20.9801911, 52.2370217]);
  });

  it("keeps only places whose tags fall into one of the categories", async () => {
    const res = await app.request(`/v1/places?bbox=${AROUND_VENUE}&interests=cultural`);
    const body = PlacesResponseSchema.parse(await res.json());
    expect(body.features.length).toBeGreaterThan(0);
    expect(body.features.length).toBeLessThan(5);
    expect(
      body.features.every((f) => interestsOfTags(f.properties.interests).includes("cultural")),
    ).toBe(true);
  });

  it("returns no places for a category without data", async () => {
    const res = await app.request(`/v1/places?bbox=${AROUND_VENUE}&interests=sports`);
    expect(PlacesResponseSchema.parse(await res.json()).features).toHaveLength(0);
  });

  it.each([
    ["a missing bbox", "/v1/places"],
    ["a malformed bbox", "/v1/places?bbox=1,2,3"],
    ["an unknown interest", `/v1/places?bbox=${AROUND_VENUE}&interests=pizza`],
  ])("rejects %s with a VALIDATION error", async (_, url) => {
    const res = await app.request(url);
    expect(res.status).toBe(400);
    expect(ApiErrorSchema.parse(await res.json()).error.code).toBe("VALIDATION");
  });
});

describe("GET /v1/places/:id", () => {
  it("returns the full place matching the contract", async () => {
    const res = await app.request("/v1/places/kercelak");
    expect(res.status).toBe(200);
    const place = PlaceSchema.parse(await res.json());
    expect(place.facts.length).toBeGreaterThan(0);
    expect(place.sources[0]?.id).toBe("s1");
  });

  it("includes what stands there today from the downloaded Google data", async () => {
    const place = PlaceSchema.parse(
      await (await app.request("/v1/places/dom-sierot-jaktorowska-6")).json(),
    );
    expect(place.todayNearby.length).toBeGreaterThan(0);
    expect(place.todayNearby[0]?.googleMapsUrl).toMatch(/^https:\/\/maps\.google\.com/);
  });

  it("returns NOT_FOUND for an unknown id", async () => {
    const res = await app.request("/v1/places/nope");
    expect(res.status).toBe(404);
    expect(ApiErrorSchema.parse(await res.json()).error.code).toBe("NOT_FOUND");
  });

  it("returns 502 when the database fails", async () => {
    const failing: PlacesRepository = {
      listInBBox: () => Promise.reject(new Error("unused")),
      listNearLine: () => Promise.reject(new Error("unused")),
      getById: () => Promise.reject(new AppError("UPSTREAM_ERROR", "Supabase place_detail failed")),
    };
    const res = await createApp({
      corsOrigins: [],
      services: { routePlanner: createFakeRoutePlanner(), places: failing },
    }).request("/v1/places/kercelak");
    expect(res.status).toBe(502);
    expect(ApiErrorSchema.parse(await res.json()).error.code).toBe("UPSTREAM_ERROR");
  });
});
