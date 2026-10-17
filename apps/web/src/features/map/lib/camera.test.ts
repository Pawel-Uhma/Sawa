import type { Route } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import {
  cameraMoveKey,
  DEFAULT_MAP_PADDING,
  paddingWithSheet,
  resolveCamera,
  SINGLE_POINT_ZOOM,
} from "./camera";

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
  ],
  places: [],
  totalMin: 8,
  endsAtStart: false,
  attribution: [],
};

const PADDING = { top: 0, right: 0, bottom: 200, left: 0 };

describe("resolveCamera", () => {
  it("stays put without a request or a route", () => {
    expect(resolveCamera(undefined, undefined)).toBeNull();
  });

  it("follows the route by default", () => {
    expect(resolveCamera(undefined, ROUTE)).toEqual({
      type: "fit",
      bounds: [
        [20.96, 52.23],
        [20.98, 52.24],
      ],
    });
  });

  it("centres on a point in [lng, lat] order", () => {
    expect(
      resolveCamera({ type: "center", center: { lat: 52.2, lng: 21 }, zoom: 17 }, ROUTE),
    ).toEqual({ type: "ease", center: [21, 52.2], zoom: 17 });
  });

  it("fits several points and centres a single one", () => {
    const points = [
      { lat: 52.23, lng: 20.96 },
      { lat: 52.25, lng: 21.0 },
    ];
    expect(resolveCamera({ type: "fit", points, maxZoom: 17 }, undefined)).toEqual({
      type: "fit",
      bounds: [
        [20.96, 52.23],
        [21.0, 52.25],
      ],
      maxZoom: 17,
    });
    expect(resolveCamera({ type: "fit", points: [points[0]] }, undefined)).toEqual({
      type: "ease",
      center: [20.96, 52.23],
      zoom: SINGLE_POINT_ZOOM,
    });
  });

  it("stays put when asked to fit a route that is missing", () => {
    expect(resolveCamera({ type: "route" }, undefined)).toBeNull();
    expect(resolveCamera({ type: "fit", points: [] }, ROUTE)).toBeNull();
  });
});

describe("cameraMoveKey", () => {
  it("is equal for equal requests built on different renders", () => {
    const a = resolveCamera({ type: "center", center: { lat: 52.2, lng: 21 } }, undefined);
    const b = resolveCamera({ type: "center", center: { lat: 52.2, lng: 21 } }, undefined);
    expect(cameraMoveKey(a, { ...PADDING })).toBe(cameraMoveKey(b, { ...PADDING }));
  });

  it("changes with the padding", () => {
    const move = resolveCamera(undefined, ROUTE);
    expect(cameraMoveKey(move, PADDING)).not.toBe(cameraMoveKey(move, { ...PADDING, bottom: 300 }));
  });
});

describe("paddingWithSheet", () => {
  it("keeps the left panel clear on a wide screen", () => {
    expect(paddingWithSheet(DEFAULT_MAP_PADDING, { width: 1280, height: 800 })).toEqual({
      ...DEFAULT_MAP_PADDING,
      left: 412,
    });
  });

  it("keeps half the height clear on a phone", () => {
    expect(paddingWithSheet(DEFAULT_MAP_PADDING, { width: 375, height: 812 })).toEqual({
      ...DEFAULT_MAP_PADDING,
      bottom: 406,
    });
  });

  it("keeps a larger padding from the screen", () => {
    const padding = { ...DEFAULT_MAP_PADDING, bottom: 500 };
    expect(paddingWithSheet(padding, { width: 375, height: 812 })).toEqual(padding);
  });
});
