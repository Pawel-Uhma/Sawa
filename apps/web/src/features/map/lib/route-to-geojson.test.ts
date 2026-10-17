import type { Route } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { routeBounds, routeLegsToGeoJson, routePlacesToGeoJson } from "./route-to-geojson";

const stop = (id: string, lat: number, lng: number) => ({ id, name: id, position: { lat, lng } });

const ROUTE: Route = {
  id: "r1",
  legs: [
    {
      line: "10",
      mode: "tram",
      headsign: "Wola",
      fromStop: stop("a", 52.23, 20.96),
      toStop: stop("b", 52.24, 20.98),
      departAt: "2026-10-17T14:00:00+02:00",
      durationMin: 8,
      lngLats: [
        [20.96, 52.23],
        [20.98, 52.24],
      ],
    },
    {
      line: "520",
      mode: "bus",
      headsign: "Centrum",
      fromStop: stop("b", 52.24, 20.98),
      toStop: stop("c", 52.25, 21.0),
      departAt: "2026-10-17T14:10:00+02:00",
      durationMin: 5,
      lngLats: [
        [20.98, 52.24],
        [21.0, 52.25],
      ],
    },
  ],
  places: [
    {
      placeId: "late",
      name: "Late",
      position: { lat: 52.245, lng: 20.99 },
      etaSec: 600,
      windowSec: 60,
      legIndex: 1,
      distanceM: 40,
    },
    {
      placeId: "early",
      name: "Early",
      position: { lat: 52.231, lng: 20.961 },
      etaSec: 30,
      windowSec: 120,
      legIndex: 0,
      distanceM: 20,
    },
  ],
  totalMin: 13,
  attribution: [],
};

describe("routeLegsToGeoJson", () => {
  it("turns each leg into a [lng, lat] LineString tagged with its mode", () => {
    const { features } = routeLegsToGeoJson(ROUTE);
    expect(features).toHaveLength(2);
    expect(features[0].geometry.coordinates[0]).toEqual([20.96, 52.23]);
    expect(features.map((f) => f.properties.mode)).toEqual(["tram", "bus"]);
  });

  it("skips legs without a drawable shape", () => {
    const route = { ...ROUTE, legs: [{ ...ROUTE.legs[0], lngLats: [[20.96, 52.23]] }] } as Route;
    expect(routeLegsToGeoJson(route).features).toEqual([]);
  });
});

describe("routePlacesToGeoJson", () => {
  it("numbers places by etaSec and puts lng first", () => {
    const { features } = routePlacesToGeoJson(ROUTE);
    expect(features.map((f) => [f.properties.id, f.properties.order])).toEqual([
      ["early", 1],
      ["late", 2],
    ]);
    expect(features[0].geometry.coordinates).toEqual([20.961, 52.231]);
  });
});

describe("routeBounds", () => {
  it("covers every leg point and place", () => {
    expect(routeBounds(ROUTE)).toEqual([
      [20.96, 52.23],
      [21.0, 52.25],
    ]);
  });

  it("returns null for a route with nothing to draw", () => {
    const empty = { ...ROUTE, legs: [{ ...ROUTE.legs[0], lngLats: [] }], places: [] };
    expect(routeBounds(empty)).toBeNull();
  });
});
