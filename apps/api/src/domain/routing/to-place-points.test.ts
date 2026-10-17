import { describe, expect, it } from "vitest";
import { toPlacePoints } from "./to-place-points";

describe("toPlacePoints", () => {
  it("keeps position and interests and turns richness into a weight", () => {
    expect(
      toPlacePoints([
        {
          id: "kercelak",
          name: "Kercelak",
          kind: "site",
          interests: ["everyday_life"],
          position: { lat: 52.237, lng: 20.9802 },
          richness: 3,
        },
      ]),
    ).toEqual([
      {
        id: "kercelak",
        name: "Kercelak",
        position: { lat: 52.237, lng: 20.9802 },
        interests: ["everyday_life"],
        weight: 3,
      },
    ]);
  });
});
