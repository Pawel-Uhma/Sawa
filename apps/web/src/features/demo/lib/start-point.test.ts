import { HACKATHON_VENUE } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { resolveStart, startLabel } from "./start-point";

const mokotow = { lat: 52.1934, lng: 21.0346 };
const krakow = { lat: 50.0614, lng: 19.9366 };

describe("resolveStart", () => {
  it("starts at 42 Warsaw in venue mode, even with a fix", () => {
    expect(resolveStart("venue", mokotow, null)).toEqual({
      status: "venue",
      point: HACKATHON_VENUE,
    });
  });

  it("starts where the phone is", () => {
    expect(resolveStart("gps", mokotow, null)).toEqual({ status: "located", point: mokotow });
  });

  it("keeps the last fix when a later update fails", () => {
    expect(resolveStart("gps", mokotow, "unavailable").status).toBe("located");
  });

  it("falls back to 42 Warsaw outside the city", () => {
    expect(resolveStart("gps", krakow, null)).toEqual({
      status: "outside",
      point: HACKATHON_VENUE,
    });
  });

  it("falls back to 42 Warsaw while locating and without permission", () => {
    expect(resolveStart("gps", null, null)).toEqual({
      status: "locating",
      point: HACKATHON_VENUE,
    });
    expect(resolveStart("gps", null, "denied")).toEqual({
      status: "denied",
      point: HACKATHON_VENUE,
    });
  });
});

describe("startLabel", () => {
  it("says when the start is not the listener's location", () => {
    expect(startLabel("located")).toBe("Twoja lokalizacja");
    expect(startLabel("denied")).toContain("42 Warsaw");
  });
});
