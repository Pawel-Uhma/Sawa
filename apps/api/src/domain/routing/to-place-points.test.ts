import { describe, expect, it } from "vitest";
import { toPlacePoints } from "./to-place-points";

describe("toPlacePoints", () => {
  it("maps tags to broad interests and richness to a weight, keeps the kind", () => {
    expect(
      toPlacePoints([
        {
          id: "kercelak",
          name: "Kercelak",
          kind: "site",
          interests: ["everyday_life", "war_uprising"],
          position: { lat: 52.237, lng: 20.9802 },
          richness: 3,
        },
      ]),
    ).toEqual([
      {
        id: "kercelak",
        name: "Kercelak",
        kind: "site",
        position: { lat: 52.237, lng: 20.9802 },
        interests: ["historical", "cultural"],
        weight: 3,
        richness: 3,
      },
    ]);
  });
});
