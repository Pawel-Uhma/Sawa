import { describe, expect, it } from "vitest";
import { boardingTimerId, countdownOf, parseBoardingTimerId } from "./boarding-timers";

const NOW = Date.parse("2026-10-18T10:00:00+02:00");
const inMin = (min: number) => NOW + min * 60_000;

describe("countdownOf", () => {
  it("rounds the minutes left up", () => {
    expect(countdownOf(inMin(8.2), NOW, 3)).toEqual({ kind: "min", min: 9, isHurry: false });
  });

  it("hurries when the departure is no further than the walk to the stop", () => {
    expect(countdownOf(inMin(4), NOW, 4)).toEqual({ kind: "min", min: 4, isHurry: true });
    expect(countdownOf(inMin(4), NOW, 0)).toEqual({ kind: "min", min: 4, isHurry: false });
  });

  it("says now under a minute, also just after the departure", () => {
    expect(countdownOf(inMin(0.5), NOW, 2)).toEqual({ kind: "now" });
    expect(countdownOf(inMin(-0.5), NOW, 2)).toEqual({ kind: "now" });
  });

  it("falls back to the clock far ahead or once the vehicle has left", () => {
    expect(countdownOf(inMin(120), NOW, 2)).toEqual({ kind: "clock" });
    expect(countdownOf(inMin(-5), NOW, 2)).toEqual({ kind: "clock" });
  });
});

describe("boardingTimerId", () => {
  it("round-trips every kind", () => {
    const cases = [
      { kind: "min", min: 12, isHurry: true },
      { kind: "now" },
      { kind: "clock" },
    ] as const;
    for (const countdown of cases) {
      const id = boardingTimerId("dark", "#d62828", countdown, "14:05", "en");
      const parsed = parseBoardingTimerId(id);
      expect(parsed?.countdown).toEqual(countdown);
      expect(parsed?.color).toBe("#d62828");
      expect(parsed?.theme).toBe("dark");
    }
    expect(
      parseBoardingTimerId(boardingTimerId("light", "#d62828", { kind: "clock" }, "14:05", "pl"))
        ?.clock,
    ).toBe("14:05");
    expect(
      parseBoardingTimerId(boardingTimerId("light", "#d62828", { kind: "now" }, "", "en"))?.lang,
    ).toBe("en");
  });

  it("ignores other image ids", () => {
    expect(parseBoardingTimerId("sawa-cluster-light-12")).toBeNull();
    expect(parseBoardingTimerId("sawa-timer-light-d62828-x")).toBeNull();
  });
});
