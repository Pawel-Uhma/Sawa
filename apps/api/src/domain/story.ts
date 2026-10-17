import { factId, type StoryStyle } from "@sawa/shared";
import type { Place, PlaceSource } from "./place";

/** Polish speech in ElevenLabs runs at about 2.5 words a second (docs/12-plan-mvp.md §8). */
export const WORDS_PER_SEC = 2.5;

/**
 * Share of the window Sawa fills with speech: the rest is a breath before the next place, and
 * room for a voice slower than `WORDS_PER_SEC`. The story may end early, never run over.
 */
export const SPEECH_FILL = 0.85;

/** A story length: `sec` of the window it fills, `words` the model may use. */
export type StoryBand = { id: string; sec: number; words: number };

/** Windows are rounded down to these steps, so nearby `targetSec` values share one cached story. */
const BAND_STEP_SEC = 20;
const LONG_BAND_STEP_SEC = 30;
const LONG_BAND_FROM_SEC = 120;
const MIN_BAND_SEC = 20;

/**
 * The length that fits the time until the next place (`targetSec`): so Sawa talks about this
 * place while passing it and starts the next story as the next place comes up.
 */
export function bandFor(targetSec: number): StoryBand {
  const step = targetSec < LONG_BAND_FROM_SEC ? BAND_STEP_SEC : LONG_BAND_STEP_SEC;
  const sec = Math.max(MIN_BAND_SEC, Math.floor(targetSec / step) * step);
  return { id: `${sec}s`, sec, words: Math.round(sec * WORDS_PER_SEC * SPEECH_FILL) };
}

/** `placeId + sorted interests + band` (docs/12-plan-mvp.md §6), plus what makes the text differ. */
export function storyCacheKey(
  placeId: string,
  interests: readonly string[],
  band: StoryBand,
  extra: readonly string[] = [],
) {
  return [placeId, [...interests].sort().join(","), band.id, ...extra].join("|");
}

/** One line Sawa can tell: a fact or a trivia, with its stable id. */
export type StoryFact = { id: string; text: string; kind: "fact" | "trivia" };

/** The facts of this story: new ones first; when all were heard, one to recall (`recap`). */
export type FactPick = { facts: StoryFact[]; recap: boolean };

/** Share of the words the facts may take; the rest is Sawa's own words around them. */
const FACT_WORD_SHARE = 0.7;
/** "Same ciekawostki": one or two lines, then silence until the next place. */
const TRIVIA_STYLE_FACTS = 2;
const TRIVIA_STYLE_WORDS = 40;
const RECAP_WORDS = 35;

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** Facts in the seed's order (the most important first), then trivia. */
export function placeFacts(place: Pick<Place, "facts" | "trivia">): StoryFact[] {
  const lines: StoryFact[] = [
    ...place.facts.map((text) => ({ id: factId(text), text, kind: "fact" as const })),
    ...place.trivia.map((text) => ({ id: factId(text), text, kind: "trivia" as const })),
  ];
  return lines.filter((line, i) => lines.findIndex((l) => l.id === line.id) === i);
}

/** How many words the story may have: trivia and reminders are short whatever the window. */
export function storyWords(band: StoryBand, style: StoryStyle | undefined, recap: boolean) {
  if (recap) return Math.min(band.words, RECAP_WORDS);
  if (style === "trivia") return Math.min(band.words, TRIVIA_STYLE_WORDS);
  return band.words;
}

/**
 * Picks what Sawa tells about a place: facts the listener has not heard yet, in the seed's
 * order (so the obvious ones come first, also for a local in a district new to them), as many
 * as fit the length. `reservedWords` is room for the background. Trivia style starts with trivia.
 */
export function pickFacts(
  place: Pick<Place, "facts" | "trivia">,
  opts: { heard: readonly string[]; style?: StoryStyle; band: StoryBand; reservedWords?: number },
): FactPick {
  const all = placeFacts(place);
  const ordered =
    opts.style === "trivia"
      ? [...all.filter((f) => f.kind === "trivia"), ...all.filter((f) => f.kind === "fact")]
      : all;
  const fresh = ordered.filter((f) => !opts.heard.includes(f.id));
  const recap = fresh.length === 0 && ordered.length > 0;
  const pool = recap ? ordered : fresh;
  const maxCount = recap ? 1 : opts.style === "trivia" ? TRIVIA_STYLE_FACTS : pool.length;
  const budget =
    (storyWords(opts.band, opts.style, recap) - (opts.reservedWords ?? 0)) * FACT_WORD_SHARE;

  const facts: StoryFact[] = [];
  let words = 0;
  for (const fact of pool) {
    if (facts.length >= maxCount) break;
    const n = wordCount(fact.text);
    if (facts.length > 0 && words + n > budget) break;
    facts.push(fact);
    words += n;
  }
  return { facts, recap };
}

export type StoryDraft = { text: string; sources: PlaceSource[] };

/**
 * Reads the model's `{ text, sourceIds }` answer. Unknown source ids are dropped; with none left
 * the story cites all of the place's sources, since its facts come only from them.
 * Returns null when the answer is not usable.
 */
export function parseStoryAnswer(raw: string, place: Place): StoryDraft | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.replace(/^\s*```(?:json)?|```\s*$/g, ""));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const { text, sourceIds } = parsed as { text?: unknown; sourceIds?: unknown };
  if (typeof text !== "string") return null;
  const clean = cleanForSpeech(text);
  if (!clean) return null;

  const ids = Array.isArray(sourceIds) ? sourceIds.filter((id) => typeof id === "string") : [];
  const cited = place.sources.filter((s) => ids.includes(s.id));
  return { text: clean, sources: cited.length ? cited : place.sources };
}

/** The text goes straight to TTS: no markdown, no links, single spaces. */
export function cleanForSpeech(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_#`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Used when the LLM is missing or fails: the picked facts read plainly. Plain, but true and
 * sourced, so the demo never goes silent. Without the LLM the background is not woven in,
 * so it stays unexplained for the next story.
 */
export function factsStory(place: Place, pick: FactPick): StoryDraft {
  const intro = pick.recap ? `Znowu mijamy: ${place.name}.` : `Mijamy: ${place.name}.`;
  const text = cleanForSpeech([intro, ...pick.facts.map((f) => f.text)].join(" "));
  return { text, sources: place.sources };
}
