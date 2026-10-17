import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { AppError } from "../../lib/errors";
import detailSample from "./__fixtures__/supabase-place-detail-sample.json";
import bboxSample from "./__fixtures__/supabase-places-in-bbox-sample.json";
import nearLineSample from "./__fixtures__/supabase-places-near-line-sample.json";
import type { Database } from "./database.types";
import { createFakePlacesRepository } from "./fake-places-repository";
import { toPlace, toPlaceSummaries, toPlacesAlongLine } from "./place-mappers";
import { createSupabasePlacesRepository } from "./places-repository";

describe("place mappers on real Supabase responses", () => {
  it("maps places_in_bbox GeoJSON to summaries with {lat, lng}", () => {
    const places = toPlaceSummaries(bboxSample);
    expect(places).toHaveLength(bboxSample.features.length);
    const kercelak = places.find((p) => p.id === "kercelak");
    expect(kercelak?.position).toEqual({ lat: 52.2370217, lng: 20.9801911 });
  });

  it("maps places_near_line rows and keeps line order", () => {
    const places = toPlacesAlongLine(nearLineSample);
    expect(places.length).toBe(nearLineSample.length);
    const fractions = places.map((p) => p.fraction);
    expect(fractions).toEqual([...fractions].sort((a, b) => a - b));
    expect(places[0]).toHaveProperty("distanceM");
  });

  it("maps place_detail with source ids and photos", () => {
    const place = toPlace(detailSample[0]);
    expect(place?.id).toBe("kercelak");
    expect(place?.facts.length).toBeGreaterThan(0);
    expect(place?.sources[0]?.id).toBe("s1");
    expect(place?.photos[0]).toHaveProperty("pageUrl");
  });

  it("returns null for an unknown id", () => {
    expect(toPlace(null)).toBeNull();
  });

  it("rejects a response that breaks the schema", () => {
    expect(() => toPlace({ ...detailSample[0], kind: "castle" })).toThrow();
  });
});

describe("createSupabasePlacesRepository", () => {
  const dbReturning = (result: { data: unknown; error: { message: string } | null }) =>
    ({ rpc: async () => result }) as unknown as SupabaseClient<Database>;

  it("throws UPSTREAM_ERROR when the RPC fails", async () => {
    const repo = createSupabasePlacesRepository(
      dbReturning({ data: null, error: { message: "boom" } }),
    );
    await expect(repo.getById("kercelak")).rejects.toMatchObject({ code: "UPSTREAM_ERROR" });
  });

  it("throws UPSTREAM_TIMEOUT when the request is aborted", async () => {
    const repo = createSupabasePlacesRepository(
      dbReturning({ data: null, error: { message: "AbortError: The operation was aborted" } }),
    );
    await expect(repo.getById("kercelak")).rejects.toBeInstanceOf(AppError);
    await expect(repo.getById("kercelak")).rejects.toMatchObject({ code: "UPSTREAM_TIMEOUT" });
  });
});

describe("createFakePlacesRepository", () => {
  const repo = createFakePlacesRepository();

  it("lists places in a box, richest first, filtered by interests", async () => {
    const box = { minLng: 20.97, minLat: 52.23, maxLng: 20.99, maxLat: 52.24 };
    const all = await repo.listInBBox(box);
    expect(all).toHaveLength(5);
    expect(all.map((p) => p.richness)).toEqual(
      [...all.map((p) => p.richness)].sort((a, b) => b - a),
    );
    const jewish = await repo.listInBBox(box, ["jewish_warsaw"]);
    expect(jewish.every((p) => p.interests.includes("jewish_warsaw"))).toBe(true);
  });

  it("skips places farther than the radius from the line and orders them along it", async () => {
    const line = [
      { lat: 52.2357, lng: 20.977 },
      { lat: 52.2369, lng: 20.98 },
    ];
    const near = await repo.listNearLine(line, 60);
    expect(near.length).toBeGreaterThan(0);
    expect(near.every((p) => p.distanceM <= 60)).toBe(true);
    expect(near.map((p) => p.fraction)).toEqual(
      [...near.map((p) => p.fraction)].sort((a, b) => a - b),
    );
  });

  it("returns a full place by id and null otherwise", async () => {
    expect((await repo.getById("okopy-lubomirskiego"))?.name).toMatch(/Okopy/);
    expect(await repo.getById("nope")).toBeNull();
  });
});
