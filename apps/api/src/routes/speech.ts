import { SpeechRequestSchema } from "@sawa/shared";
import { Hono } from "hono";
import { jsonBody } from "../lib/validate";
import type { SpeechService } from "../services/speak";

export function createSpeechRoutes(speech: SpeechService) {
  return new Hono().post("/v1/speech", jsonBody(SpeechRequestSchema), async (c) => {
    const { audio, contentType } = await speech.speak(c.req.valid("json").text);
    return c.body(audio, 200, { "Content-Type": contentType, "Cache-Control": "no-store" });
  });
}
