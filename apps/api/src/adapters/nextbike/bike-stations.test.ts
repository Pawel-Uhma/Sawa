import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createNextbikeStationSource, parseStations } from "./bike-stations";

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8"));
const INFORMATION = fixture("nextbike-station-information.json");
const STATUS = fixture("nextbike-station-status.json");

const answer = (url: string) =>
  new Response(JSON.stringify(url.includes("station_information") ? INFORMATION : STATUS));

describe("parseStations", () => {
  it("joins Veturilo stations with their live counts", () => {
    const stations = parseStations(INFORMATION, STATUS);
    expect(stations).toHaveLength(4);
    expect(stations?.[0]).toEqual({
      id: "203610",
      name: "Koneser",
      position: { lat: 52.25602, lng: 21.046219 },
      bikesAvailable: 10,
      docksAvailable: 0,
      capacity: 10,
    });
  });

  it("gives no bikes at a station that does not rent", () => {
    const mlociny = parseStations(INFORMATION, STATUS)?.find((s) => s.name === "Metro Młociny");
    expect(mlociny?.bikesAvailable).toBe(0);
  });

  it("rejects an unexpected answer", () => {
    expect(parseStations({ data: {} }, STATUS)).toBeUndefined();
  });
});

describe("createNextbikeStationSource", () => {
  it("keeps the stations for a minute", async () => {
    let now = 0;
    const fetch = vi.fn(async (url: string) => answer(url));
    const source = createNextbikeStationSource({ fetch, clock: () => now });
    await source.stations();
    now = 30_000;
    await source.stations();
    expect(fetch).toHaveBeenCalledTimes(2); // information + status, once
    now = 61_000;
    await source.stations();
    expect(fetch).toHaveBeenCalledTimes(3); // status only; information is kept for a day
  });

  it("serves the last stations as stale when the feed fails", async () => {
    let now = 0;
    let isDown = false;
    const fetch = vi.fn(async (url: string) =>
      isDown ? new Response("", { status: 503 }) : answer(url),
    );
    const source = createNextbikeStationSource({ fetch, clock: () => now });
    await source.stations();
    isDown = true;
    now = 120_000;
    const result = await source.stations();
    expect(result.stale).toBe(true);
    expect(result.stations).toHaveLength(4);
  });

  it("throws UPSTREAM_ERROR with nothing to serve", async () => {
    const fetch = vi.fn(async () => new Response("", { status: 503 }));
    const source = createNextbikeStationSource({ fetch });
    await expect(source.stations()).rejects.toMatchObject({ code: "UPSTREAM_ERROR" });
  });
});
