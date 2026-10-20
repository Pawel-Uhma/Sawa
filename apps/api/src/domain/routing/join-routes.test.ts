import { type Leg, type Route, RouteSchema } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { joinRoutes } from "./join-routes";

const A = { lat: 52.23, lng: 20.98 };
const B = { lat: 52.24, lng: 21.0 };
const C = { lat: 52.25, lng: 21.02 };

function walk(from: typeof A, to: typeof A, min: number): Leg {
  return {
    line: "",
    mode: "walk",
    headsign: "Cel",
    fromStop: { id: "start", name: "Start", position: from },
    toStop: { id: "end", name: "Cel", position: to },
    departAt: "2026-10-17T12:00:00.000Z",
    durationMin: min,
    lngLats: [
      [from.lng, from.lat],
      [to.lng, to.lat],
    ],
  };
}

function part(id: string, legs: Leg[], places: Route["places"], totalMin: number): Route {
  return { id, legs, places, totalMin, endsAtStart: false, attribution: ["OSM"] };
}

const place = (placeId: string, etaSec: number, legIndex = 0) => ({
  placeId,
  name: placeId,
  position: A,
  etaSec,
  windowSec: 60,
  legIndex,
  distanceM: 20,
});

describe("joinRoutes", () => {
  it("puts the parts one after another, shifting places in time and legs", () => {
    const route = joinRoutes({
      parts: [
        part("a", [walk(A, B, 10)], [place("p1", 120)], 10),
        part("b", [walk(B, C, 5)], [place("p2", 60)], 5),
      ],
      waypoints: [{ position: B, name: "Kawiarnia" }],
      origin: A,
    });
    expect(() => RouteSchema.parse(route)).not.toThrow();
    expect(route.totalMin).toBe(15);
    expect(route.legs.map((l) => l.toStop.name)).toEqual(["Kawiarnia", "Cel"]);
    expect(route.legs[1]?.fromStop.name).toBe("Kawiarnia");
    expect(route.places.map((p) => [p.placeId, p.etaSec, p.legIndex])).toEqual([
      ["p1", 120, 0],
      ["p2", 660, 1],
    ]);
    expect(route.attribution).toEqual(["OSM"]);
  });

  it("tells the story of a waypoint place when it is reached and drops places too close", () => {
    const route = joinRoutes({
      parts: [
        part("a", [walk(A, B, 10)], [place("p1", 120), place("near", 590)], 10),
        part("b", [walk(B, C, 10)], [place("p2", 300)], 10),
      ],
      waypoints: [{ position: B, name: "Kercelak", placeId: "kercelak" }],
      origin: A,
    });
    expect(route.places.map((p) => p.placeId)).toEqual(["p1", "kercelak", "p2"]);
    const stop = route.places[1];
    expect(stop).toMatchObject({ etaSec: 600, legIndex: 0, position: B });
    expect(stop?.windowSec).toBeGreaterThan(0);
  });

  it("tells a place passed twice only once", () => {
    const route = joinRoutes({
      parts: [
        part("a", [walk(A, B, 10)], [place("p1", 120)], 10),
        part("b", [walk(B, A, 10)], [place("p1", 300)], 10),
      ],
      waypoints: [{ position: B, name: "Przystanek" }],
      origin: A,
      destination: A,
    });
    expect(route.places.map((p) => p.placeId)).toEqual(["p1"]);
    expect(route.endsAtStart).toBe(true);
    expect(route.endsAtDestination).toBe(false);
  });

  it("keeps the name of a real tram stop at a waypoint", () => {
    const ride: Leg = {
      ...walk(A, B, 10),
      line: "17",
      mode: "tram",
      toStop: { id: "7008-01", name: "Rondo Daszyńskiego", position: B },
    };
    const route = joinRoutes({
      parts: [part("a", [ride], [], 10), part("b", [walk(B, C, 5)], [], 5)],
      waypoints: [{ position: B, name: "Kawiarnia" }],
      origin: A,
    });
    expect(route.legs[0]?.toStop.name).toBe("Rondo Daszyńskiego");
  });
});
