import type { Story, StoryRequestInput } from "@sawa/shared";
import { contextFor, knownContextsOf } from "../domain/contexts";
import {
  bandFor,
  cleanForSpeech,
  createStoryTextReader,
  type FactPick,
  factsStory,
  findingSources,
  fitWords,
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
import type { PlaceResearch } from "./research-place";

/** The demo replays the same route; stories stay in memory until story_cache lands (R2). */
const MAX_CACHED_STORIES = 500;
/** Polish runs about 2 tokens a word; the margin keeps the JSON from being cut off. */
const TOKENS_PER_WORD = 3;
/** The background takes at most this share of the story; the place itself comes first. */
const CONTEXT_WORD_SHARE = 0.4;

export type StoryService = {
  tell(request: StoryRequestInput): Promise<Story>;
  /** The same story, its text in pieces as the model writes it, so the voice can start early. */
  tellStream(request: StoryRequestInput): Promise<StoryStream>;
  /** Starts the research for a planned route's places, so their stories do not wait for it. */
  warm(placeIds: readonly string[]): void;
};

export type StoryStream = {
  text: AsyncIterable<string>;
  /** The whole text when it was known up front (cache, facts story): its voice may be cached. */
  whole?: string;
  /** The finished story, once `text` was read to the end. */
  story: Promise<Story>;
};

export type StoryDeps = {
  places: Pick<PlacesRepository, "getById">;
  /** Missing → every story is the place's facts read plainly (factsStory). */
  llm?: LlmProvider;
  /** Missing → stories use the seed's facts only. */
  research?: PlaceResearch;
  /** Called when the LLM fails and the facts story is used instead. */
  onLlmError?: (err: unknown, placeId: string) => void;
};

/** What the listener heard: the lines the model says it told, else all it was given. */
function toldIds(pick: FactPick, draft: StoryDraft) {
  if (pick.recap) return [];
  const offered = pick.facts.map((f) => f.id);
  const used = draft.usedIds.filter((id) => offered.includes(id));
  return used.length ? used : offered;
}

async function* once(text: string) {
  yield text;
}

/** A story known in full, as a stream of one piece. */
const known = (story: Story): StoryStream => ({
  text: once(story.text),
  whole: story.text,
  story: Promise.resolve(story),
});

export function createStoryService({ places, llm, research, onLlmError }: StoryDeps): StoryService {
  const cache = new Map<string, Promise<StoryDraft>>();

  function remember(key: string, draft: Promise<StoryDraft>) {
    cache.set(key, draft);
    if (cache.size > MAX_CACHED_STORIES) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
  }

  /** Everything a story needs before the model writes it. */
  async function prepare(request: StoryRequestInput) {
    const { placeId, targetSec, storyStyle, familiarity, audience, side } = request;
    const { interests = [], heardFacts = [], knownContexts = [] } = request;
    const place = await places.getById(placeId);
    if (!place) throw new AppError("NOT_FOUND", `Place "${placeId}" not found`);
    const band = bandFor(targetSec);
    const context = contextFor(place, familiarity, knownContexts);
    const reservedWords = context ? Math.round(band.words * CONTEXT_WORD_SHARE) : 0;
    const findings = llm && research ? await research.find(place) : [];
    const sources = [...place.sources, ...findingSources(findings)];
    const pick = pickFacts(place, {
      heard: heardFacts,
      style: storyStyle,
      audience,
      band,
      reservedWords,
      findings,
    });
    const words = fitWords(storyWords(band, storyStyle, pick.recap, audience), pick, reservedWords);
    // What the listener remembers once the story was heard (apps/web lib/memory.ts).
    const answer = (draft: StoryDraft, cached: boolean): Story => ({
      placeId,
      text: draft.text,
      sources: draft.sources,
      cached,
      factIds: toldIds(pick, draft),
      contextIds: context ? [context.id] : [],
      recap: pick.recap,
    });
    // Read plainly, war facts are too harsh for a child: the facts story keeps to the name.
    const plainPick = audience === "kids" && isGentleForKids(place) ? { ...pick, facts: [] } : pick;
    const plainDraft = factsStory(place, plainPick, sources, words);
    // The facts story does not explain the background, so it stays unexplained.
    const plain = {
      ...answer(plainDraft, false),
      factIds: toldIds(plainPick, plainDraft),
      contextIds: [],
    };
    const key = storyCacheKey(placeId, interests, band, [
      storyStyle ?? "",
      familiarity ?? "",
      audience === "kids" ? "kids" : "",
      side ?? "",
      pick.facts.map((f) => f.id).join("."),
      context?.id ?? "",
      String(pick.recap),
      ...knownContextsOf(place, knownContexts).map((c) => c.id),
    ]);
    const prompt = {
      system: audience === "kids" ? KIDS_STORY_SYSTEM_PROMPT : STORY_SYSTEM_PROMPT,
      user: storyUserPrompt(place, interests, {
        pick,
        sources,
        words,
        style: storyStyle,
        familiarity,
        audience,
        side,
        context,
        knownContexts: knownContextsOf(place, knownContexts),
      }),
      maxTokens: band.words * TOKENS_PER_WORD,
    };
    return { placeId, sources, answer, plain, key, prompt };
  }

  async function tell(request: StoryRequestInput): Promise<Story> {
    const { placeId, sources, answer, plain, key, prompt } = await prepare(request);
    if (!llm) return plain;
    const hit = cache.get(key);
    if (hit) return answer(await hit, true);

    // The promise is cached, so two players asking at once pay for one story.
    const pending = llm.complete(prompt).then((raw) => {
      const draft = parseStoryAnswer(raw, sources);
      if (!draft) throw new AppError("UPSTREAM_ERROR", "LLM answer is not a story");
      return draft;
    });
    remember(key, pending);

    try {
      return answer(await pending, false);
    } catch (err) {
      // Not cached: the next ride asks the LLM again.
      cache.delete(key);
      onLlmError?.(err, placeId);
      return plain;
    }
  }

  return {
    tell,

    async tellStream(request) {
      if (!llm?.stream) return known(await tell(request));
      const { placeId, sources, answer, plain, key, prompt } = await prepare(request);
      const hit = cache.get(key);
      if (hit) return known(await hit.then((d) => answer(d, true)).catch(() => plain));

      const stream = llm.stream.bind(llm);
      let finish: (story: Story) => void = () => {};
      const story = new Promise<Story>((resolve) => {
        finish = resolve;
      });
      // Cached at once, so a second player asking now waits for this story instead of paying.
      let settle: { ok: (d: StoryDraft) => void; fail: (err: unknown) => void } | undefined;
      const pending = new Promise<StoryDraft>((ok, fail) => {
        settle = { ok, fail };
      });
      pending.catch(() => {});
      remember(key, pending);

      async function* text() {
        const reader = createStoryTextReader();
        let said = "";
        try {
          for await (const delta of stream(prompt)) {
            const piece = reader.push(delta);
            if (!piece) continue;
            said += piece;
            yield piece;
          }
          const draft = parseStoryAnswer(reader.raw, sources);
          if (!draft) throw new AppError("UPSTREAM_ERROR", "LLM answer is not a story");
          settle?.ok(draft);
          finish(answer(draft, false));
        } catch (err) {
          // Not cached: the next ride asks the LLM again.
          cache.delete(key);
          settle?.fail(err);
          onLlmError?.(err, placeId);
          if (said.trim()) {
            // Cut off mid-story: what Sawa already said is the story.
            finish(answer({ text: cleanForSpeech(said), sources, usedIds: [] }, false));
            return;
          }
          yield plain.text;
          finish(plain);
        }
      }
      return { text: text(), story };
    },

    warm(placeIds) {
      if (!llm || !research) return;
      for (const id of placeIds) {
        places
          .getById(id)
          .then((place) => place && research.find(place))
          .catch(() => {});
      }
    },
  };
}
