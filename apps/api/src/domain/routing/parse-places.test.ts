import { describe, expect, it } from "vitest";
import { parsePlaces } from "./parse-places";

const feature = (id: string, extra: object = {}) => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [20.9802, 52.237] },
  properties: {
    id,
    name: "Kercelak",
    kind: "site",
    interests: ["everyday_life"],
    richness: 3,
    ...extra,
  },
});

describe("parsePlaces", () => {
  it("maps places_in_bbox features to planner places", () => {
    const { places, skipped } = parsePlaces({
      type: "FeatureCollection",
      features: [feature("kercelak")],
    });
    expect(skipped).toBe(0);
    expect(places).toEqual([
      {
        id: "kercelak",
        name: "Kercelak",
        position: { lat: 52.237, lng: 20.9802 },
        interests: ["everyday_life"],
        weight: 3,
      },
    ]);
  });

  it("skips broken features instead of failing", () => {
    const { places, skipped } = parsePlaces({
      type: "FeatureCollection",
      features: [feature("ok"), feature("bad", { richness: "lots" }), { type: "Feature" }],
    });
    expect(places.map((p) => p.id)).toEqual(["ok"]);
    expect(skipped).toBe(2);
  });

  it("rejects input that is not a FeatureCollection", () => {
    expect(() => parsePlaces({ features: [] })).toThrow();
  });
});
