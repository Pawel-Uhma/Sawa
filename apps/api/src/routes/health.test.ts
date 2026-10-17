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
    const res = await createHealthRoutes("2026-10-17", () => new Date(now)).request("/health");
    const body = HealthSchema.parse(await res.json());
    expect(body).toMatchObject({ ok: true, transitDate: "2026-10-17", transitIsToday: today });
  });

  it("asks for the graph in use at the request time", async () => {
    const transitDate = (now: Date) => warsawDate(now);
    const res = await createHealthRoutes(
      transitDate,
      () => new Date("2026-10-18T09:00:00Z"),
    ).request("/health");
    expect(await res.json()).toMatchObject({ transitDate: "2026-10-18", transitIsToday: true });
  });
});
