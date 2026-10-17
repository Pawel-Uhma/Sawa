import { describe, expect, it } from "vitest";
import { pickServiceDate } from "./load-transit";

describe("pickServiceDate", () => {
  const dates = ["2026-10-17", "2026-10-18", "2026-10-19"];

  it.each([
    ["2026-10-18", "2026-10-18"],
    ["2026-10-25", "2026-10-19"],
    ["2026-10-01", "2026-10-17"],
  ])("on %s uses %s", (date, expected) => {
    expect(pickServiceDate(dates, date)).toBe(expected);
  });
});
