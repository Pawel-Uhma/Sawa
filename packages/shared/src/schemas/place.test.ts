import { describe, expect, it } from "vitest";
import { PlacesQuerySchema } from "./place";

describe("PlacesQuerySchema", () => {
  it("parses bbox and interests from the query string", () => {
    expect(
      PlacesQuerySchema.parse({
        bbox: "20.96,52.22,21.0,52.25",
        interests: "war_uprising, people",
      }),
    ).toEqual({
      bbox: { minLng: 20.96, minLat: 52.22, maxLng: 21.0, maxLat: 52.25 },
      interests: ["war_uprising", "people"],
    });
  });

  it("leaves interests out when not given", () => {
    expect(PlacesQuerySchema.parse({ bbox: "20.96,52.22,21,52.25" }).interests).toBeUndefined();
  });

  it.each([
    ["three numbers", { bbox: "20.96,52.22,21" }],
    ["text in bbox", { bbox: "a,b,c,d" }],
    ["min above max", { bbox: "21,52.25,20.96,52.22" }],
    ["an unknown interest", { bbox: "20.96,52.22,21,52.25", interests: "pizza" }],
  ])("rejects %s", (_, query) => {
    expect(PlacesQuerySchema.safeParse(query).success).toBe(false);
  });
});
