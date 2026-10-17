import { describe, expect, it } from "vitest";
import type { MockStop } from "./mock-data";
import { clipKey, targetSecFor } from "./story-player";

describe("clipKey", () => {
  const listener = { interests: ["historical" as const], storyStyle: "fun" as const };

  it("changes with interests, style and story length, not only the stop", () => {
    const key = clipKey("p1", listener, 60);
    expect(clipKey("p1", listener, 60)).toBe(key);
    expect(clipKey("p1", { ...listener, interests: ["nature"] }, 60)).not.toBe(key);
    expect(clipKey("p1", { ...listener, storyStyle: "deep" }, 60)).not.toBe(key);
    expect(clipKey("p1", listener, 120)).not.toBe(key);
    expect(clipKey("p2", listener, 60)).not.toBe(key);
  });
});

describe("targetSecFor", () => {
  const stop = (etaSec: number, windowSec?: number) =>
    ({ id: `p${etaSec}`, etaSec, etaMin: Math.round(etaSec / 60), windowSec }) as MockStop;

  it("takes the planner's window when there is one", () => {
    expect(targetSecFor([stop(0, 90), stop(200)], 0)).toBe(90);
  });

  it("else talks until the next stop", () => {
    expect(targetSecFor([stop(30), stop(170)], 0)).toBe(140);
  });
});
