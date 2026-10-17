import { describe, expect, it } from "vitest";
import { stopIndexAt } from "./demo-drive";
import type { MockStop } from "./mock-data";

const stop = (along: number) => ({ along }) as MockStop;
const stops = [stop(0), stop(0.3), stop(0.7)];

describe("stopIndexAt", () => {
  it("zaczyna od pierwszego punktu i przeskakuje na kolejne przy ich progu", () => {
    expect(stopIndexAt(stops, 0)).toBe(0);
    expect(stopIndexAt(stops, 0.29)).toBe(0);
    expect(stopIndexAt(stops, 0.3)).toBe(1);
    expect(stopIndexAt(stops, 0.69)).toBe(1);
    expect(stopIndexAt(stops, 1)).toBe(2);
  });
});
