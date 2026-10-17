import type { Place } from "../domain/place";
import { type Finding, parseResearchAnswer } from "../domain/research";
import { RESEARCH_SYSTEM_PROMPT, researchQuery } from "../prompts/research";
import type { LlmProvider } from "./ports";

/** Search results the model reads per place (OpenRouter's web plugin bills per result). */
const MAX_RESULTS = 5;
const MAX_TOKENS = 1500;
/** Every place in the city fits; research is per place, not per listener. */
const MAX_CACHED_PLACES = 3000;
/**
 * How long a story waits for the research. The player asks for the next place while the current
 * story plays, so this mostly hides; past it the story uses the seed and the research lands
 * for the next ask.
 */
export const RESEARCH_WAIT_MS = 12_000;

/** Stories and trivia about a place from the web (T-41), so Sawa has more than the seed's facts. */
export type PlaceResearch = {
  /** Findings, the most interesting first; empty when there is nothing or the search failed. */
  find(place: Place): Promise<Finding[]>;
};

export type PlaceResearchDeps = {
  llm: LlmProvider;
  waitMs?: number;
  onError?: (err: unknown, placeId: string) => void;
};

/** Missing `llm.completeWithWeb` → no research, the stories use the seed only. */
export function createPlaceResearch({
  llm,
  waitMs = RESEARCH_WAIT_MS,
  onError,
}: PlaceResearchDeps): PlaceResearch {
  const cache = new Map<string, Promise<Finding[]>>();
  const search = llm.completeWithWeb?.bind(llm);

  function research(place: Place): Promise<Finding[]> {
    if (!search) return Promise.resolve([]);
    const hit = cache.get(place.id);
    if (hit) return hit;
    // The promise is cached, so two listeners near one place pay for one search.
    const pending = search({
      system: RESEARCH_SYSTEM_PROMPT,
      user: researchQuery(place),
      maxTokens: MAX_TOKENS,
      maxResults: MAX_RESULTS,
    })
      .then(({ content, citations }) => parseResearchAnswer(content, citations))
      .catch((err: unknown) => {
        // Not cached: the next story about this place searches again.
        cache.delete(place.id);
        onError?.(err, place.id);
        return [];
      });
    cache.set(place.id, pending);
    if (cache.size > MAX_CACHED_PLACES) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    return pending;
  }

  return {
    async find(place) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const late = new Promise<Finding[]>((resolve) => {
        timer = setTimeout(() => resolve([]), waitMs);
      });
      try {
        return await Promise.race([research(place), late]);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
