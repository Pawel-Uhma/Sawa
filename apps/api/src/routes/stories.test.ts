import { ApiErrorSchema, StorySchema } from "@sawa/shared";
import { describe, expect, it, vi } from "vitest";
import { createFakePlacesRepository } from "../adapters/supabase/fake-places-repository";
import { createApp } from "../app";
import { createFakeRoutePlanner } from "../services/fake-route-planner";
import type { SpeechService } from "../services/speak";

const FAKE_MP3 = new Uint8Array([0xff, 0xfb, 0x90, 0x00]);
const places = createFakePlacesRepository();
const llm = { model: "fake", complete: async () => '{"text":"Hej, patrz.","sourceIds":[]}' };

const appWith = (speech?: SpeechService) =>
  createApp({
    corsOrigins: [],
    services: { routePlanner: createFakeRoutePlanner(), places, llm, speech },
  });

const post = (app: ReturnType<typeof appWith>, path: string, body: unknown) =>
  app.request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

async function anyPlaceId() {
  const [first] = await places.listInBBox({ minLng: -180, minLat: -90, maxLng: 180, maxLat: 90 });
  return first?.id ?? "";
}

describe("POST /v1/stories", () => {
  it("returns a story for a known place", async () => {
    const placeId = await anyPlaceId();
    const res = await post(appWith(), "/v1/stories", { placeId, interests: [], targetSec: 30 });
    expect(res.status).toBe(200);
    expect(StorySchema.parse(await res.json())).toMatchObject({ placeId, text: "Hej, patrz." });
  });

  it.each([
    ["no place", { targetSec: 30 }],
    ["zero length", { placeId: "x", targetSec: 0 }],
    ["unknown interest", { placeId: "x", targetSec: 30, interests: ["food"] }],
  ])("rejects %s with a VALIDATION error", async (_, body) => {
    const res = await post(appWith(), "/v1/stories", body);
    expect(res.status).toBe(400);
    expect(ApiErrorSchema.parse(await res.json()).error.code).toBe("VALIDATION");
  });

  it("answers 404 for an unknown place", async () => {
    const res = await post(appWith(), "/v1/stories", { placeId: "nope", targetSec: 30 });
    expect(res.status).toBe(404);
  });
});

describe("POST /v1/stories/audio", () => {
  it("reads the story text with the speaker", async () => {
    const speak = vi.fn(async () => ({ audio: FAKE_MP3, contentType: "audio/mpeg" }));
    const res = await post(appWith({ speak }), "/v1/stories/audio", {
      placeId: await anyPlaceId(),
      targetSec: 30,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(FAKE_MP3);
    expect(speak).toHaveBeenCalledWith("Hej, patrz.");
  });

  it("answers 502 when speech is not configured", async () => {
    const res = await post(appWith(), "/v1/stories/audio", {
      placeId: await anyPlaceId(),
      targetSec: 30,
    });
    expect(res.status).toBe(502);
    expect(ApiErrorSchema.parse(await res.json()).error.code).toBe("UPSTREAM_ERROR");
  });
});
