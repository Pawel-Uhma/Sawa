import { MAX_EXCLUDED_PLACES, type Route } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { randomSeed, routeChoices, seenPlaceIds } from "./route-choices";

const leg = (mode: Route["legs"][number]["mode"]): Route["legs"][number] => ({
  line: mode === "walk" ? "" : "13",
  mode,
  headsign: "",
  fromStop: { id: "a", name: "A", position: { lat: 0, lng: 0 } },
  toStop: { id: "b", name: "B", position: { lat: 0, lng: 0 } },
  departAt: "2026-10-20T10:00:00Z",
  durationMin: 5,
  lngLats: [],
});

const route = (id: string, placeIds: string[], extra: Partial<Route> = {}): Route => ({
  id,
  legs: [leg("walk"), leg("tram")],
  places: placeIds.map((placeId) => ({
    placeId,
    name: placeId,
    position: { lat: 0, lng: 0 },
    etaSec: 0,
    windowSec: 0,
    legIndex: 0,
    distanceM: 0,
  })),
  totalMin: 30,
  endsAtStart: false,
  attribution: [],
  ...extra,
});

describe("routeChoices", () => {
  it("lists the route first, then its alternatives, none carrying the others", () => {
    const choices = routeChoices(route("a", ["x"], { alternatives: [route("b", ["y"])] }));
    expect(choices.map((r) => r.id)).toEqual(["a", "b"]);
    expect(choices[0]).not.toHaveProperty("alternatives");
  });

  it("is just the route for an older answer", () => {
    expect(routeChoices(route("a", ["x"])).map((r) => r.id)).toEqual(["a"]);
  });
});

describe("seenPlaceIds", () => {
  it("adds the places of new routes once each", () => {
    expect(seenPlaceIds(["x"], [route("a", ["x", "y"]), route("b", ["y", "z"])])).toEqual([
      "x",
      "y",
      "z",
    ]);
  });

  it("keeps at most what the API accepts, dropping the oldest", () => {
    const many = Array.from({ length: MAX_EXCLUDED_PLACES + 5 }, (_, i) => `p${i}`);
    const seen = seenPlaceIds([], [route("a", many)]);
    expect(seen).toHaveLength(MAX_EXCLUDED_PLACES);
    expect(seen[0]).toBe("p5");
  });
});

describe("randomSeed", () => {
  it("is a non-negative 31-bit integer", () => {
    expect(randomSeed(() => 0)).toBe(0);
    const seed = randomSeed(() => 0.999999);
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeLessThan(2_147_483_647);
  });
});
