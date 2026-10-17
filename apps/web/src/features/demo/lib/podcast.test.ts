import { describe, expect, it } from "vitest";
import { backTarget, formatClock, inMinutes } from "./podcast";

describe("formatClock", () => {
  it("formats minutes and padded seconds", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(65.9)).toBe("1:05");
    expect(formatClock(1440)).toBe("24:00");
  });

  it("adds hours from an hour up", () => {
    expect(formatClock(5840)).toBe("1:37:20");
    expect(formatClock(3605)).toBe("1:00:05");
  });

  it("never goes below zero", () => {
    expect(formatClock(-3)).toBe("0:00");
  });
});

describe("inMinutes", () => {
  it("rounds to minutes, under a minute is a moment", () => {
    expect(inMinutes(30)).toBe("za chwilę");
    expect(inMinutes(1500)).toBe("za ok. 25 min");
  });
});

describe("backTarget", () => {
  it("goes to the previous place at the start of a story", () => {
    expect(backTarget(3, 2)).toBe(2);
  });

  it("restarts the story once it is under way", () => {
    expect(backTarget(3, 40)).toBe(3);
  });

  it("restarts the first story, there is nothing before it", () => {
    expect(backTarget(0, 0)).toBe(0);
  });
});
