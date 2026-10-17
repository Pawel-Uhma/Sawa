import { ApiErrorSchema, HACKATHON_VENUE, RouteSchema } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { createFakeRoutePlanner } from "../services/fake-route-planner";

const app = createApp({ corsOrigins: [], services: { routePlanner: createFakeRoutePlanner() } });

const plan = (body: unknown) =>
  app.request("/v1/routes/plan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /v1/routes/plan", () => {
  it("returns a route matching the contract", async () => {
    const res = await plan({
      origin: HACKATHON_VENUE,
      durationMin: 60,
      interests: ["historical"],
    });
    expect(res.status).toBe(200);
    const route = RouteSchema.parse(await res.json());
    expect(route.places.length).toBeGreaterThan(0);
  });

  it.each([
    ["a too short ride", { origin: HACKATHON_VENUE, durationMin: 4, interests: ["historical"] }],
    ["an unknown interest", { origin: HACKATHON_VENUE, durationMin: 60, interests: ["pizza"] }],
    ["no interests", { origin: HACKATHON_VENUE, durationMin: 60, interests: [] }],
    [
      "an unknown story style",
      { origin: HACKATHON_VENUE, durationMin: 60, interests: ["historical"], storyStyle: "rap" },
    ],
    [
      "a category instead of a tile in tags",
      { origin: HACKATHON_VENUE, durationMin: 60, interests: ["historical"], tags: ["historical"] },
    ],
    [
      "a destination together with a loop",
      {
        origin: HACKATHON_VENUE,
        durationMin: 60,
        interests: ["historical"],
        returnToStart: true,
        destination: HACKATHON_VENUE,
      },
    ],
  ])("rejects %s with a VALIDATION error", async (_, body) => {
    const res = await plan(body);
    expect(res.status).toBe(400);
    expect(ApiErrorSchema.parse(await res.json()).error.code).toBe("VALIDATION");
  });
});

describe("GET /v1/routes/demo", () => {
  it("returns a route matching the contract", async () => {
    const res = await app.request("/v1/routes/demo");
    expect(res.status).toBe(200);
    RouteSchema.parse(await res.json());
  });
});
