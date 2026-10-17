import { ApiErrorSchema, MAX_SPEECH_CHARS } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { createFakeRoutePlanner } from "../services/fake-route-planner";
import { createDisabledSpeechService, createSpeechService } from "../services/speak";

const FAKE_MP3 = new Uint8Array([0xff, 0xfb, 0x90, 0x00]);

const appWith = (
  speech = createSpeechService({
    synthesize: async () => ({ audio: FAKE_MP3, contentType: "audio/mpeg" }),
  }),
) =>
  createApp({
    corsOrigins: [],
    debugPages: true,
    services: { routePlanner: createFakeRoutePlanner(), speech },
  });

const speak = (app: ReturnType<typeof appWith>, body: unknown) =>
  app.request("/v1/speech", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /v1/speech", () => {
  it("is not mounted outside debug pages", async () => {
    const app = createApp({
      corsOrigins: [],
      services: { routePlanner: createFakeRoutePlanner() },
    });
    const res = await app.request("/v1/speech", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "Cześć" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns mp3 audio", async () => {
    const res = await speak(appWith(), { text: "Cześć, jestem Sawa." });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(FAKE_MP3);
  });

  it.each([
    ["empty text", { text: "   " }],
    ["too long text", { text: "a".repeat(MAX_SPEECH_CHARS + 1) }],
    ["no text", {}],
  ])("rejects %s with a VALIDATION error", async (_, body) => {
    const res = await speak(appWith(), body);
    expect(res.status).toBe(400);
    expect(ApiErrorSchema.parse(await res.json()).error.code).toBe("VALIDATION");
  });

  it("answers 502 when speech is not configured", async () => {
    const res = await speak(appWith(createDisabledSpeechService()), { text: "Cześć" });
    expect(res.status).toBe(502);
    expect(ApiErrorSchema.parse(await res.json()).error.code).toBe("UPSTREAM_ERROR");
  });
});
