import { HealthSchema } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { createHealthRoutes, warsawDate } from "./health";

describe("GET /health", () => {
  it("uses the Warsaw calendar day", () => {
    expect(warsawDate(new Date("2026-10-17T22:30:00Z"))).toBe("2026-10-18");
  });

  it.each([
    ["2026-10-17T12:00:00Z", true],
    ["2026-10-18T12:00:00Z", false],
  ])("on %s says whether the transit graph is for today", async (now, today) => {
    const res = await createHealthRoutes("2026-10-17", "off", () => new Date(now)).request(
      "/health",
    );
    const body = HealthSchema.parse(await res.json());
    expect(body).toMatchObject({ ok: true, transitDate: "2026-10-17", transitIsToday: today });
  });
});
