import type { Route, TrackVehiclesResponse } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { lineColor } from "./map-style";
import {
  highlightedLegs,
  lineIndexes,
  lineShapesToGeoJson,
  routeBoardingsToGeoJson,
  routeBounds,
  routeLegsToGeoJson,
  routePlacesToGeoJson,
  routeWalksToGeoJson,
  stopPost,
} from "./route-to-geojson";

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
  endsAtStart: false,
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

describe("lineShapesToGeoJson", () => {
  const shape: [number, number][] = [
    [20.9, 52.2],
    [21.1, 52.3],
  ];
  const vehicles = (legs: TrackVehiclesResponse["legs"]): TrackVehiclesResponse => ({
    generatedAt: "2026-10-17T12:00:00Z",
    live: true,
    stale: false,
    refreshSec: 10,
    legs,
    attribution: [],
  });

  it("draws the whole route of each line in its leg's colour", () => {
    const { features } = lineShapesToGeoJson(
      ROUTE,
      vehicles([
        { legIndex: 0, line: "10", shape, vehicles: [] },
        { legIndex: 1, line: "520", shape, vehicles: [] },
      ]),
    );
    expect(features.map((f) => f.properties.color)).toEqual([lineColor(0), lineColor(1)]);
    expect(features[0]?.geometry.coordinates).toEqual(shape);
  });

  it("skips legs without a shape and has nothing before the first answer", () => {
    expect(lineShapesToGeoJson(ROUTE, undefined).features).toEqual([]);
    const legs = [{ legIndex: 0, line: "10", unknownLeg: true, vehicles: [] }];
    expect(lineShapesToGeoJson(ROUTE, vehicles(legs)).features).toEqual([]);
  });
});

describe("lines and transfers", () => {
  const sameLineAgain = { ...ROUTE.legs[0], departAt: "2026-10-17T14:20:00+02:00" };
  const stayOn = {
    ...ROUTE.legs[0],
    fromStop: ROUTE.legs[0].toStop,
    toStop: ROUTE.legs[1].fromStop,
  };
  const route = {
    ...ROUTE,
    legs: [ROUTE.legs[0], stayOn, ROUTE.legs[1], sameLineAgain],
  };

  it("keeps one line index for consecutive legs on the same line", () => {
    expect(lineIndexes(route)).toEqual([0, 0, 1, 2]);
  });

  it("starts a new line when the same number is boarded at another stop", () => {
    const across = { ...ROUTE.legs[0], fromStop: stop("b2", 52.2401, 20.9801) };
    const transfer = { ...ROUTE, legs: [ROUTE.legs[0], across] };
    expect(lineIndexes(transfer)).toEqual([0, 1]);
    const { features } = routeBoardingsToGeoJson(transfer);
    expect(features.map((f) => [f.properties.stopName, f.properties.isTransfer])).toEqual([
      ["a", false],
      ["b2", true],
    ]);
  });

  it("colours each leg by its line", () => {
    const colors = routeLegsToGeoJson(route).features.map((f) => f.properties.color);
    expect(colors).toEqual([lineColor(0), lineColor(0), lineColor(1), lineColor(2)]);
    expect(lineColor(0)).not.toBe(lineColor(1));
  });

  it("marks the start and every change of line, not a leg that stays on the line", () => {
    const { features } = routeBoardingsToGeoJson(route);
    expect(features.map((f) => [f.properties.line, f.properties.isTransfer])).toEqual([
      ["10", false],
      ["520", true],
      ["10", true],
    ]);
    expect(features[1].geometry.coordinates).toEqual([20.98, 52.24]);
  });

  it("lights up a walk alone and a ride with every leg of its line", () => {
    const walk = { ...ROUTE.legs[0], mode: "walk" as const, line: "" };
    const legs = [walk, ...route.legs];
    expect(highlightedLegs(legs, 0)).toEqual([0]);
    expect(highlightedLegs(legs, 1)).toEqual([1, 2]);
    expect(highlightedLegs(legs, 3)).toEqual([3]);
    expect(highlightedLegs(legs, 9)).toEqual([]);
  });

  it("labels a transfer with the line left and the line boarded", () => {
    const { features } = routeBoardingsToGeoJson(route);
    expect(features.map((f) => f.properties.label)).toEqual(["10", "10 → 520", "520 → 10"]);
  });

  it("labels each boarding with its stop and Warsaw time, marking estimates", () => {
    const legs = ROUTE.legs.map((leg, i) => (i === 0 ? { ...leg, realDeparture: true } : leg));
    const { features } = routeBoardingsToGeoJson({ ...ROUTE, legs });
    expect(features.map((f) => [f.properties.stopName, f.properties.boardAt])).toEqual([
      ["a", "14:00"],
      ["b", "ok. 14:10"],
    ]);
  });

  it("gives each boarding its departure and the walk right before it", () => {
    const walk = { ...ROUTE.legs[0], line: "", mode: "walk" as const, durationMin: 3.5 };
    const { features } = routeBoardingsToGeoJson({ ...ROUTE, legs: [walk, ...ROUTE.legs] });
    expect(features.map((f) => [f.properties.walkMin, f.properties.clock])).toEqual([
      [3.5, "14:00"],
      [0, "14:10"],
    ]);
    expect(features[0].properties.departAtMs).toBe(Date.parse("2026-10-17T14:00:00+02:00"));
  });

  it("adds the ZTM post number to the stop name", () => {
    const legs = [
      { ...ROUTE.legs[0], fromStop: { ...stop("700905", 52.23, 21.01), name: "Centrum" } },
    ];
    expect(routeBoardingsToGeoJson({ ...ROUTE, legs }).features[0].properties.stopName).toBe(
      "Centrum 05",
    );
  });

  it("reads the post from a 6-digit ZTM id only", () => {
    expect(stopPost("100102")).toBe("02");
    expect(stopPost("mock-plocka")).toBeNull();
  });

  it("draws a walking leg along its whole path, joined to the ride that follows", () => {
    const path: [number, number][] = [
      [20.955, 52.228],
      [20.957, 52.228],
      [20.958, 52.2295],
      [20.96, 52.23],
    ];
    const walk = {
      ...ROUTE.legs[0],
      line: "",
      mode: "walk" as const,
      fromStop: stop("start", 52.228, 20.955),
      toStop: ROUTE.legs[0].fromStop,
      lngLats: path,
    };
    const { features } = routeWalksToGeoJson({ ...ROUTE, legs: [walk, ...ROUTE.legs] });
    expect(features.map((f) => f.geometry.coordinates)).toEqual([path]);
  });

  it("draws a walk only where the next leg starts somewhere else", () => {
    expect(routeWalksToGeoJson(ROUTE).features).toEqual([]);
    const moved = {
      ...ROUTE,
      legs: [
        ROUTE.legs[0],
        {
          ...ROUTE.legs[1],
          lngLats: [
            [20.981, 52.241],
            [21.0, 52.25],
          ],
        },
      ],
    } as Route;
    const [walk] = routeWalksToGeoJson(moved).features;
    expect(walk.geometry.coordinates).toEqual([
      [20.98, 52.24],
      [20.981, 52.241],
    ]);
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

  it("adds kind and subkind of the places it knows", () => {
    const markers = new Map([["late", { kind: "church", subkind: "church" }]]);
    const { features } = routePlacesToGeoJson(ROUTE, markers);
    expect(features.map((f) => [f.properties.kind, f.properties.subkind])).toEqual([
      [undefined, undefined],
      ["church", "church"],
    ]);
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
