import { describe, expect, it } from "vitest";
import { screenCamera } from "./screen-camera";

const ORIGIN = { lat: 52.2359, lng: 20.9789 };
const PLACE = { lat: 52.2413, lng: 21.0299 };
const STOP = { lat: 52.23, lng: 21.01 };
const BASE = { place: null, activeStop: null, destination: null, origin: ORIGIN, isDesktop: false };

describe("screenCamera", () => {
  it("keeps the view while an opened place is still loading, so the map moves once (#117)", () => {
    expect(screenCamera({ ...BASE, place: { position: null } })).toEqual({ type: "stay" });
    expect(screenCamera({ ...BASE, place: { position: null }, activeStop: STOP })).toEqual({
      type: "stay",
    });
  });

  it("centres a loaded place without touching the zoom", () => {
    expect(screenCamera({ ...BASE, place: { position: PLACE }, activeStop: STOP })).toEqual({
      type: "center",
      center: PLACE,
    });
  });

  it("keeps the view after the place card closes", () => {
    expect(screenCamera({ ...BASE, placeClosed: true })).toEqual({ type: "stay" });
    expect(screenCamera({ ...BASE, placeClosed: true, activeStop: STOP })).toEqual({
      type: "stay",
    });
  });

  it("follows the active route stop", () => {
    expect(screenCamera({ ...BASE, activeStop: STOP })).toEqual({
      type: "center",
      center: STOP,
      zoom: 15.4,
    });
  });

  it("fits start and destination together", () => {
    expect(screenCamera({ ...BASE, destination: PLACE })).toEqual({
      type: "fit",
      points: [ORIGIN, PLACE],
      maxZoom: 15,
    });
  });

  it("centres the start with a closer zoom on desktop", () => {
    expect(screenCamera(BASE)).toEqual({ type: "center", center: ORIGIN, zoom: 14.8 });
    expect(screenCamera({ ...BASE, isDesktop: true })).toEqual({
      type: "center",
      center: ORIGIN,
      zoom: 15.3,
    });
  });
});
