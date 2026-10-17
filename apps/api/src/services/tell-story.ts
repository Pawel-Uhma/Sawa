import type { Story, StoryRequest } from "@sawa/shared";
import {
  bandFor,
  factsStory,
  parseStoryAnswer,
  type StoryDraft,
  storyCacheKey,
} from "../domain/story";
import { AppError } from "../lib/errors";
import { STORY_SYSTEM_PROMPT, storyUserPrompt } from "../prompts/story";
import type { LlmProvider, PlacesRepository } from "./ports";

/** The demo replays the same route; stories stay in memory until story_cache lands (R2). */
const MAX_CACHED_STORIES = 500;
/** Polish runs about 2 tokens a word; the margin keeps the JSON from being cut off. */
const TOKENS_PER_WORD = 3;

export type StoryService = {
  tell(request: StoryRequest): Promise<Story>;
};

export type StoryDeps = {
  places: Pick<PlacesRepository, "getById">;
  /** Missing → every story is the place's facts read plainly (factsStory). */
  llm?: LlmProvider;
  /** Called when the LLM fails and the facts story is used instead. */
  onLlmError?: (err: unknown, placeId: string) => void;
};

export function createStoryService({ places, llm, onLlmError }: StoryDeps): StoryService {
  const cache = new Map<string, Promise<StoryDraft>>();

  return {
    async tell({ placeId, interests, targetSec }) {
      const place = await places.getById(placeId);
      if (!place) throw new AppError("NOT_FOUND", `Place "${placeId}" not found`);
      const band = bandFor(targetSec);
      if (!llm) return { placeId, ...factsStory(place, band), cached: false };

      const key = storyCacheKey(placeId, interests, band);
      const hit = cache.get(key);
      if (hit) return { placeId, ...(await hit), cached: true };

      // The promise is cached, so two players asking at once pay for one story.
      const pending = llm
        .complete({
          system: STORY_SYSTEM_PROMPT,
          user: storyUserPrompt(place, interests, band),
          maxTokens: band.words * TOKENS_PER_WORD,
        })
        .then((raw) => {
          const draft = parseStoryAnswer(raw, place);
          if (!draft) throw new AppError("UPSTREAM_ERROR", "LLM answer is not a story");
          return draft;
        });
      cache.set(key, pending);
      if (cache.size > MAX_CACHED_STORIES) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }

      try {
        return { placeId, ...(await pending), cached: false };
      } catch (err) {
        // Not cached: the next ride asks the LLM again.
        cache.delete(key);
        onLlmError?.(err, placeId);
        return { placeId, ...factsStory(place, band), cached: false };
      }
    },
  };
}
