import { ApiErrorSchema, HealthSchema } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";

const app = createApp({
  corsOrigins: ["http://localhost:3000"],
  corsPreviewPattern: "^https://sawa-[a-z0-9-]+.vercel.app$",
});

describe("GET /health", () => {
  it("returns ok and a version", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(HealthSchema.parse(await res.json()).ok).toBe(true);
  });
});

describe("errors", () => {
  it("returns a typed 404 body for unknown routes", async () => {
    const res = await app.request("/nope");
    expect(res.status).toBe(404);
    expect(ApiErrorSchema.parse(await res.json()).error.code).toBe("NOT_FOUND");
  });
});

describe("CORS", () => {
  it.each([
    ["http://localhost:3000", true],
    ["https://sawa-git-r3-map.vercel.app", true],
    ["https://evil.example.com", false],
  ])("origin %s allowed: %s", async (origin, allowed) => {
    const res = await app.request("/health", { headers: { Origin: origin } });
    expect(res.headers.get("access-control-allow-origin")).toBe(allowed ? origin : null);
  });
});
