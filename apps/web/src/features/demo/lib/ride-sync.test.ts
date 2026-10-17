import { describe, expect, it } from "vitest";
import type { MockStop } from "./mock-data";
import { ARRIVE_M } from "./ride-clock";
import { reachedIndex } from "./ride-sync";

// Punkty co ok. 1 km na wschód wzdłuż jednej szerokości geograficznej.
const stop = (id: string, lng: number): MockStop => ({
  id,
  name: id,
  interest: "historical",
  line: "22",
  coord: [lng, 52.23],
  along: 0,
  etaMin: 0,
});
const stops = [stop("a", 21.0), stop("b", 21.015), stop("c", 21.03), stop("d", 21.045)];
const at = (lng: number) => ({ lat: 52.23, lng });

describe("reachedIndex", () => {
  it("finds the stop the rider is at, after the current one", () => {
    expect(reachedIndex(stops, at(21.015), 0)).toBe(1);
    expect(reachedIndex(stops, at(21.03), 0)).toBe(2);
  });

  it("ignores the current stop, earlier ones and stops too far away", () => {
    expect(reachedIndex(stops, at(21.0), 0)).toBe(-1);
    expect(reachedIndex(stops, at(21.015), 1)).toBe(-1);
    expect(reachedIndex(stops, at(21.0075), 0)).toBe(-1);
  });

  it("counts a stop just inside the radius", () => {
    const deg = (ARRIVE_M - 20) / (111_320 * Math.cos((52.23 * Math.PI) / 180));
    expect(reachedIndex(stops, at(21.015 - deg), 0)).toBe(1);
  });

  it("looks only a few stops ahead, so a loop does not jump to its last stop at the start", () => {
    const loop = [...stops, stop("back", 21.0)];
    expect(reachedIndex(loop, at(21.0), 0)).toBe(-1);
    expect(reachedIndex(stops, at(21.045), 0)).toBe(-1);
    expect(reachedIndex(stops, at(21.045), 1)).toBe(3);
  });
});
