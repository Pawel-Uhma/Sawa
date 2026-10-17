import { ApiErrorSchema, LiveStorySchema, StorySchema } from "@sawa/shared";
import { describe, expect, it, vi } from "vitest";
import { createFakePlacesRepository } from "../adapters/supabase/fake-places-repository";
import { createApp } from "../app";
import { createFakeRoutePlanner } from "../services/fake-route-planner";
import { createSpeechService, type SpeechService } from "../services/speak";

const FAKE_MP3 = new Uint8Array([0xff, 0xfb, 0x90, 0x00]);
const places = createFakePlacesRepository();
const ANSWER = '{"text":"Hej, patrz.","sourceIds":[]}';
const llm = {
  model: "fake",
  complete: async () => ANSWER,
  async *stream() {
    yield ANSWER.slice(0, 12);
    yield ANSWER.slice(12);
  },
};

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
    const res = await post(appWith({ speak, speakStream: vi.fn() }), "/v1/stories/audio", {
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

describe("live stories", () => {
  const voice = createSpeechService({
    synthesize: async () => ({ audio: FAKE_MP3, contentType: "audio/mpeg" }),
    async *stream(text) {
      yield new TextEncoder().encode(`[${text}]`);
    },
  });

  async function finished(app: ReturnType<typeof appWith>, id: string) {
    for (let i = 0; i < 50; i++) {
      const state = LiveStorySchema.parse(
        await (await app.request(`/v1/stories/live/${id}`)).json(),
      );
      if (state.done) return state;
      await new Promise((r) => setTimeout(r, 5));
    }
    throw new Error("live story never finished");
  }

  it("streams the story's voice and then gives the whole story", async () => {
    const app = appWith(voice);
    const placeId = await anyPlaceId();
    const start = await post(app, "/v1/stories/live", { placeId, targetSec: 30 });
    const { id } = (await start.json()) as { id: string };

    const audio = await app.request(`/v1/stories/live/${id}/audio`);
    expect(audio.headers.get("content-type")).toBe("audio/mpeg");
    expect(new TextDecoder().decode(await audio.arrayBuffer())).toBe("[Hej, patrz.]");
    expect((await finished(app, id)).story).toMatchObject({ placeId, text: "Hej, patrz." });
  });

  it("answers byte ranges once the voice is finished", async () => {
    const app = appWith(voice);
    const { id } = (await (
      await post(app, "/v1/stories/live", { placeId: await anyPlaceId(), targetSec: 30 })
    ).json()) as { id: string };
    await (await app.request(`/v1/stories/live/${id}/audio`)).arrayBuffer();
    await finished(app, id);

    const part = await app.request(`/v1/stories/live/${id}/audio`, {
      headers: { range: "bytes=0-1" },
    });
    expect(part.status).toBe(206);
    expect(part.headers.get("content-range")).toBe("bytes 0-1/13");
    expect(new TextDecoder().decode(await part.arrayBuffer())).toBe("[H");
  });

  it("finishes with no story for an unknown place", async () => {
    const app = appWith(voice);
    const { id } = (await (
      await post(app, "/v1/stories/live", { placeId: "nope", targetSec: 30 })
    ).json()) as { id: string };
    expect(await finished(app, id)).toMatchObject({ done: true, story: null });
  });

  it("answers 404 for an unknown session", async () => {
    expect((await appWith().request("/v1/stories/live/nope")).status).toBe(404);
  });

  it("accepts a route to warm up", async () => {
    const res = await post(appWith(), "/v1/stories/warm", { placeIds: [await anyPlaceId()] });
    expect(res.status).toBe(202);
  });
});
