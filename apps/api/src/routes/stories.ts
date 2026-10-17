import { StoryRequestSchema } from "@sawa/shared";
import { Hono } from "hono";
import { jsonBody } from "../lib/validate";
import type { SpeechService } from "../services/speak";
import type { StoryService } from "../services/tell-story";

export function createStoryRoutes(stories: StoryService, speech: SpeechService) {
  return (
    new Hono()
      .post("/v1/stories", jsonBody(StoryRequestSchema), async (c) =>
        c.json(await stories.tell(c.req.valid("json"))),
      )
      // Same story as /v1/stories (shared cache), read by Sawa's voice: one call for the player.
      .post("/v1/stories/audio", jsonBody(StoryRequestSchema), async (c) => {
        const story = await stories.tell(c.req.valid("json"));
        const { audio, contentType } = await speech.speak(story.text);
        return c.body(audio, 200, { "Content-Type": contentType, "Cache-Control": "no-store" });
      })
  );
}
