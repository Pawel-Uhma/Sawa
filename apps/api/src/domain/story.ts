import type { Place, PlaceSource } from "./place";

/** Polish speech in ElevenLabs runs at about 2.5 words a second (docs/12-plan-mvp.md §8). */
export const WORDS_PER_SEC = 2.5;

export type StoryBand = { id: "short" | "medium" | "long"; upToSec: number; words: number };

/** Three lengths, so nearby `targetSec` values share one cached story. */
export const STORY_BANDS: readonly StoryBand[] = [
  { id: "short", upToSec: 30, words: 60 },
  { id: "medium", upToSec: 75, words: 140 },
  { id: "long", upToSec: Number.POSITIVE_INFINITY, words: 230 },
];

export function bandFor(targetSec: number): StoryBand {
  const long = STORY_BANDS[STORY_BANDS.length - 1] as StoryBand;
  return STORY_BANDS.find((b) => targetSec <= b.upToSec) ?? long;
}

/** `placeId + sorted interests + band` (docs/12-plan-mvp.md §6). */
export function storyCacheKey(placeId: string, interests: readonly string[], band: StoryBand) {
  return [placeId, [...interests].sort().join(","), band.id].join("|");
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
 * Used when the LLM is missing or fails: the place's own facts, cut to the band.
 * Plain, but true and sourced, so the demo never goes silent.
 */
export function factsStory(place: Place, band: StoryBand): StoryDraft {
  const sentences = [...place.facts, ...place.trivia];
  const picked: string[] = [];
  let words = 0;
  for (const s of sentences) {
    const n = s.split(/\s+/).length;
    if (picked.length && words + n > band.words) break;
    picked.push(s);
    words += n;
  }
  const text = cleanForSpeech([`Mijamy: ${place.name}.`, ...picked].join(" "));
  return { text, sources: place.sources };
}
