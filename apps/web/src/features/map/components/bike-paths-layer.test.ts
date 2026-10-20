import { describe, expect, it } from "vitest";
import { bikePathsBeforeId } from "./bike-paths-layer";

describe("bikePathsBeforeId", () => {
  it("puts bike paths over the roads and under the first label after them", () => {
    const layers = [
      { id: "background", type: "background" },
      { id: "water_name", type: "symbol" },
      { id: "highway_minor", type: "line", "source-layer": "transportation" },
      { id: "highway_major", type: "line", "source-layer": "transportation" },
      { id: "building", type: "fill" },
      { id: "highway_name_other", type: "symbol" },
    ];
    expect(bikePathsBeforeId(layers)).toBe("highway_name_other");
  });

  it("goes on top without labels after the roads or without a style", () => {
    expect(bikePathsBeforeId([{ id: "background", type: "background" }])).toBeUndefined();
    expect(bikePathsBeforeId(undefined)).toBeUndefined();
  });
});
