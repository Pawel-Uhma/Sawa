import { describe, expect, it } from "vitest";
import { shortestStopFor } from "./fastest-route";
import { DURATION_MAX_MIN } from "./mock-data";

describe("shortestStopFor", () => {
  it("picks the first slider step the fastest way fits in", () => {
    expect(shortestStopFor(20)).toBe(20);
    expect(shortestStopFor(20.4)).toBe(25);
    expect(shortestStopFor(62)).toBe(75);
    expect(shortestStopFor(2)).toBe(5);
  });

  it("stops at the last step when the fastest way is longer than the scale", () => {
    expect(shortestStopFor(500)).toBe(DURATION_MAX_MIN);
  });
});
