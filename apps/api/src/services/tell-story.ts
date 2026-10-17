import type { Story, StoryRequestInput } from "@sawa/shared";
import { contextFor, knownContextsOf } from "../domain/contexts";
import {
  bandFor,
  type FactPick,
  factsStory,
  isGentleForKids,
  parseStoryAnswer,
  pickFacts,
  type StoryDraft,
  storyCacheKey,
  storyWords,
} from "../domain/story";
import { AppError } from "../lib/errors";
import { KIDS_STORY_SYSTEM_PROMPT, STORY_SYSTEM_PROMPT, storyUserPrompt } from "../prompts/story";
import type { LlmProvider, PlacesRepository } from "./ports";

/** The demo replays the same route; stories stay in memory until story_cache lands (R2). */
const MAX_CACHED_STORIES = 500;
/** Polish runs about 2 tokens a word; the margin keeps the JSON from being cut off. */
const TOKENS_PER_WORD = 3;
/** The background takes at most this share of the story; the place itself comes first. */
const CONTEXT_WORD_SHARE = 0.4;

export type StoryService = {
  tell(request: StoryRequestInput): Promise<Story>;
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
    async tell(request) {
      const { placeId, targetSec, storyStyle, familiarity, audience } = request;
      const { interests = [], heardFacts = [], knownContexts = [] } = request;
      const place = await places.getById(placeId);
      if (!place) throw new AppError("NOT_FOUND", `Place "${placeId}" not found`);
      const band = bandFor(targetSec);
      const context = contextFor(place, familiarity, knownContexts);
      const reservedWords = context ? Math.round(band.words * CONTEXT_WORD_SHARE) : 0;
      const pick = pickFacts(place, {
        heard: heardFacts,
        style: storyStyle,
        audience,
        band,
        reservedWords,
      });
      // What the listener remembers once the story was heard (apps/web lib/memory.ts).
      const toldOf = (p: FactPick) => ({
        factIds: p.recap ? [] : p.facts.map((f) => f.id),
        recap: p.recap,
      });
      const told = { ...toldOf(pick), contextIds: context ? [context.id] : [] };
      // Read plainly, war facts are too harsh for a child: the facts story keeps to the name.
      const plainPick =
        audience === "kids" && isGentleForKids(place) ? { ...pick, facts: [] } : pick;
      // The facts story does not explain the background, so it stays unexplained.
      const plain = {
        placeId,
        ...factsStory(place, plainPick),
        cached: false,
        ...toldOf(plainPick),
        contextIds: [],
      };
      if (!llm) return plain;

      const key = storyCacheKey(placeId, interests, band, [
        storyStyle ?? "",
        familiarity ?? "",
        audience === "kids" ? "kids" : "",
        pick.facts.map((f) => f.id).join("."),
        context?.id ?? "",
        String(pick.recap),
        ...knownContextsOf(place, knownContexts).map((c) => c.id),
      ]);
      const hit = cache.get(key);
      if (hit) return { placeId, ...(await hit), cached: true, ...told };

      // The promise is cached, so two players asking at once pay for one story.
      const pending = llm
        .complete({
          system: audience === "kids" ? KIDS_STORY_SYSTEM_PROMPT : STORY_SYSTEM_PROMPT,
          user: storyUserPrompt(place, interests, {
            pick,
            words: storyWords(band, storyStyle, pick.recap, audience),
            style: storyStyle,
            familiarity,
            audience,
            context,
            knownContexts: knownContextsOf(place, knownContexts),
          }),
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
        return { placeId, ...(await pending), cached: false, ...told };
      } catch (err) {
        // Not cached: the next ride asks the LLM again.
        cache.delete(key);
        onLlmError?.(err, placeId);
        return plain;
      }
    },
  };
}
