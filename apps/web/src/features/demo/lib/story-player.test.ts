import { describe, expect, it } from "vitest";
import { clipKey } from "./story-player";

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
