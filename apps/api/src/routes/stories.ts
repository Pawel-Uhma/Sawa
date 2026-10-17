import { StoryRequestSchema } from "@sawa/shared";
import { Hono } from "hono";
import { type RateLimitOpts, rateLimit } from "../lib/rate-limit";
import { jsonBody } from "../lib/validate";
import type { SpeechService } from "../services/speak";
import type { StoryService } from "../services/tell-story";

/**
 * Each miss costs LLM and ElevenLabs credits (T-92). A ride asks for about 30 (story + voice
 * per place); the venue Wi-Fi shares one IP, so the limit leaves room for a few phones.
 */
export const STORY_RATE_LIMIT: RateLimitOpts = { limit: 300, windowMs: 10 * 60_000 };

export function createStoryRoutes(
  stories: StoryService,
  speech: SpeechService,
  limits: RateLimitOpts = STORY_RATE_LIMIT,
) {
  // One counter for both endpoints: the player calls them in pairs.
  const limiter = rateLimit(limits);
  return (
    new Hono()
      .post("/v1/stories", limiter, jsonBody(StoryRequestSchema), async (c) =>
        c.json(await stories.tell(c.req.valid("json"))),
      )
      // Same story as /v1/stories (shared cache), read by Sawa's voice: one call for the player.
      .post("/v1/stories/audio", limiter, jsonBody(StoryRequestSchema), async (c) => {
        const story = await stories.tell(c.req.valid("json"));
        const { audio, contentType } = await speech.speak(story.text);
        return c.body(audio, 200, { "Content-Type": contentType, "Cache-Control": "no-store" });
      })
  );
}
