import { ApiErrorSchema, TrackVehiclesResponseSchema } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { createFakeRoutePlanner } from "../services/fake-route-planner";

const app = createApp({ corsOrigins: [], services: { routePlanner: createFakeRoutePlanner() } });

const track = (body: unknown) =>
  app.request("/v1/vehicles/track", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /v1/vehicles/track", () => {
  it("returns a response matching the contract", async () => {
    const res = await track({
      legs: [
        {
          line: "136",
          fromStopId: "314206",
          toStopId: "512403",
          departAt: "2026-10-17T14:05:00.000Z",
        },
      ],
    });
    expect(res.status).toBe(200);
    const body = TrackVehiclesResponseSchema.parse(await res.json());
    expect(body.legs).toHaveLength(1);
  });

  it("rejects a request without legs", async () => {
    const res = await track({ legs: [] });
    expect(res.status).toBe(400);
    ApiErrorSchema.parse(await res.json());
  });
});
