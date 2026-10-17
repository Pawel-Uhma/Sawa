import { describe, expect, it } from "vitest";
import { syntheticNetwork } from "./__fixtures__/synthetic";
import { computeReturnTimes } from "./return-times";

describe("computeReturnTimes", () => {
  const network = syntheticNetwork();
  const times = computeReturnTimes(network, new Set(["A0"]), 120);

  it("is 0 at the target", () => {
    expect(times.get("A0")).toBe(0);
  });

  it("rides back on the reverse pattern: wait + transfer + ride", () => {
    // A6 → A0 on A-1: 6 stops × 90 s + 600/2 wait + 120 transfer
    expect(times.get("A6")).toBe(6 * 90 + 300 + 120);
  });

  it("chains legs through a transfer group", () => {
    // B5 → X(B3) on B-1, then X(A3) → A0 on A-1
    expect(times.get("B5")).toBe(2 * 90 + 420 + 3 * 90 + 420);
  });

  it("is missing for groups that cannot get back", () => {
    expect(times.get("nowhere")).toBeUndefined();
  });

  it("takes the faster of two ways back", () => {
    // Several targets: the closer one wins.
    const both = computeReturnTimes(network, new Set(["A0", "A5"]), 120);
    expect(both.get("A6")).toBe(1 * 90 + 300 + 120);
  });
});
