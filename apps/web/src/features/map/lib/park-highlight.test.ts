import { describe, expect, it } from "vitest";
import { findParkFeatureId, isParkPlace, parkAreaFilter, parkNameKeys } from "./park-highlight";

const point = (lng: number, lat: number) => ({ type: "Point" as const, coordinates: [lng, lat] });

describe("parkNameKeys", () => {
  it("drops quotes and case", () => {
    expect(parkNameKeys("Park Stefana Wiecheckiego „Wiecha”")).toEqual([
      "park stefana wiecheckiego wiecha",
    ]);
  });

  it("uses a note in parentheses as another name", () => {
    expect(parkNameKeys("Park Młociński (Las Młociny)")).toEqual(["park młociński", "las młociny"]);
  });
});

describe("findParkFeatureId", () => {
  const skaryszewski = [21.0551, 52.2423] as [number, number];

  it("finds the park by name", () => {
    const features = [
      {
        id: 1,
        properties: { name: "Kamionkowskie Błonia Elekcyjne" },
        geometry: point(21.06, 52.24),
      },
      { id: 94653463, properties: { name: "Park Skaryszewski" }, geometry: point(21.052, 52.243) },
    ];
    expect(findParkFeatureId(features, "Park Skaryszewski", skaryszewski)).toBe(94653463);
  });

  it("takes the nearest park with that name and skips far ones", () => {
    const features = [
      { id: 1, properties: { name: "Park Miejski" }, geometry: point(21.27, 52.1) },
      { id: 2, properties: { name: "Park Miejski" }, geometry: point(21.107, 52.322) },
    ];
    expect(findParkFeatureId(features, "Park Miejski", [21.1068, 52.3223])).toBe(2);
    expect(findParkFeatureId(features, "Park Miejski", skaryszewski)).toBeNull();
  });

  it("ignores features without an id", () => {
    const features = [
      { properties: { name: "Park Skaryszewski" }, geometry: point(21.052, 52.243) },
    ];
    expect(findParkFeatureId(features, "Park Skaryszewski", skaryszewski)).toBeNull();
  });
});

describe("parkAreaFilter", () => {
  it("matches nothing without a park", () => {
    expect(parkAreaFilter(null)).toEqual(["==", ["id"], -1]);
  });
});

describe("isParkPlace", () => {
  it("reads subkind", () => {
    expect(isParkPlace({ kind: "site", subkind: "park" })).toBe(true);
    expect(isParkPlace({ kind: "site", subkind: "garden" })).toBe(true);
    expect(isParkPlace({ kind: "site", subkind: "monument" })).toBe(false);
    expect(isParkPlace({ kind: "site" })).toBe(false);
  });
});
