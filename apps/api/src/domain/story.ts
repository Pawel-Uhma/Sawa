import { type Audience, factId, type StoryStyle } from "@sawa/shared";
import type { Place, PlaceSource } from "./place";
import type { Finding } from "./research";

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

/**
 * One line Sawa can tell, with its stable id: a story found on the web (`story`, cites
 * `sourceId`), a trivia or a fact from the seed.
 */
export type StoryFact = {
  id: string;
  text: string;
  kind: "story" | "trivia" | "fact";
  sourceId?: string;
};

/** What Sawa may tell: new lines first; when all were heard, one to recall (`recap`). */
export type FactPick = { facts: StoryFact[]; recap: boolean };

/**
 * The model gets more material than fits and tells the best of it, so the pick may run this
 * many times over the story's length.
 */
const OFFER_WORD_SHARE = 2;
const MAX_OFFERED = 8;
/** "Same ciekawostki": one or two lines, then silence until the next place. */
const TRIVIA_STYLE_FACTS = 2;
const TRIVIA_STYLE_WORDS = 40;
const RECAP_WORDS = 35;
/**
 * A story is at most this many times longer than its material: room for a hook and numbers
 * read out in words, not for filler. Below `MIN_STORY_WORDS` it would not even name the place.
 */
const MATERIAL_STRETCH = 1.6;
const MIN_STORY_WORDS = 25;
/** A child listens to shorter stories: this share of an adult's words (#65). */
const KIDS_WORD_SHARE = 0.7;

/**
 * War, the ghetto and the Holocaust: told to a child gently, without details of violence
 * (decision in docs/stan.md, #65), and never read out plainly as facts.
 */
const KIDS_GENTLE_TAGS = ["war_uprising", "jewish_warsaw"];

export const isGentleForKids = (place: Pick<Place, "interests">) =>
  place.interests.some((tag) => KIDS_GENTLE_TAGS.includes(tag));

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;
const fact = (text: string): StoryFact => ({ id: factId(text), text, kind: "fact" });

/** Web pages behind the findings, as sources the story can cite ("w1", "w2", …). */
export function findingSources(findings: readonly Finding[]): PlaceSource[] {
  const sources: PlaceSource[] = [];
  for (const f of findings) {
    if (sources.some((s) => s.url === f.url)) continue;
    sources.push({ id: `w${sources.length + 1}`, title: f.title, url: f.url });
  }
  return sources;
}

/**
 * Stories from the web first, since a podcast lives on them; then the seed's first fact (what the
 * place is), its trivia, and the other facts in their order (the most important first).
 */
export function placeFacts(
  place: Pick<Place, "facts" | "trivia">,
  findings: readonly Finding[] = [],
): StoryFact[] {
  const sources = findingSources(findings);
  const lines: StoryFact[] = [
    ...findings.map((f) => ({
      id: factId(f.text),
      text: f.text,
      kind: "story" as const,
      sourceId: sources.find((s) => s.url === f.url)?.id,
    })),
    ...place.facts.slice(0, 1).map(fact),
    ...place.trivia.map((text) => ({ id: factId(text), text, kind: "trivia" as const })),
    ...place.facts.slice(1).map(fact),
  ];
  return lines.filter((line, i) => lines.findIndex((l) => l.id === line.id) === i);
}

/** How many words the story may have: trivia and reminders are short whatever the window. */
export function storyWords(
  band: StoryBand,
  style: StoryStyle | undefined,
  recap: boolean,
  audience?: Audience,
) {
  if (recap) return Math.min(band.words, RECAP_WORDS);
  if (style === "trivia") return Math.min(band.words, TRIVIA_STYLE_WORDS);
  return audience === "kids" ? Math.round(band.words * KIDS_WORD_SHARE) : band.words;
}

/** The length is a ceiling: with little to tell, the story is short instead of padded. */
export function fitWords(limit: number, pick: FactPick, reservedWords = 0) {
  const material = pick.facts.reduce((sum, f) => sum + wordCount(f.text), 0);
  const fit = Math.round(material * MATERIAL_STRETCH) + reservedWords;
  return Math.min(limit, Math.max(MIN_STORY_WORDS, fit));
}

/**
 * Picks what Sawa may tell about a place: lines the listener has not heard yet, stories and
 * trivia early, up to twice the story's length so the model can choose the best. `reservedWords`
 * is room for the background. Trivia style offers one or two lines.
 */
export function pickFacts(
  place: Pick<Place, "facts" | "trivia">,
  opts: {
    heard: readonly string[];
    style?: StoryStyle;
    audience?: Audience;
    band: StoryBand;
    reservedWords?: number;
    findings?: readonly Finding[];
  },
): FactPick {
  const all = placeFacts(place, opts.findings);
  const fresh = all.filter((f) => !opts.heard.includes(f.id));
  const recap = fresh.length === 0 && all.length > 0;
  const pool = recap ? all : fresh;
  const maxCount = recap ? 1 : opts.style === "trivia" ? TRIVIA_STYLE_FACTS : MAX_OFFERED;
  const words = storyWords(opts.band, opts.style, recap, opts.audience) - (opts.reservedWords ?? 0);
  const budget = words * OFFER_WORD_SHARE;

  const facts: StoryFact[] = [];
  let used = 0;
  for (const fact of pool) {
    if (facts.length >= maxCount) break;
    const n = wordCount(fact.text);
    if (facts.length > 0 && used + n > budget) break;
    facts.push(fact);
    used += n;
  }
  return { facts, recap };
}

/** `usedIds`: the picked lines the model says it told. */
export type StoryDraft = { text: string; sources: PlaceSource[]; usedIds: string[] };

/**
 * Reads the model's `{ text, usedIds, sourceIds }` answer. Unknown source ids are dropped; with
 * none left the story cites all `sources`, since its facts come only from them.
 * Returns null when the answer is not usable.
 */
export function parseStoryAnswer(raw: string, sources: readonly PlaceSource[]): StoryDraft | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.replace(/^\s*```(?:json)?|```\s*$/g, ""));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const { text, sourceIds, usedIds } = parsed as Record<string, unknown>;
  if (typeof text !== "string") return null;
  const clean = cleanForSpeech(text);
  if (!clean) return null;

  const strings = (v: unknown) =>
    Array.isArray(v) ? v.filter((id): id is string => typeof id === "string") : [];
  const ids = strings(sourceIds);
  const cited = sources.filter((s) => ids.includes(s.id));
  return { text: clean, sources: cited.length ? cited : [...sources], usedIds: strings(usedIds) };
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
 * Used when the LLM is missing or fails: the picked lines read plainly, as many as fit `words`.
 * Plain, but true and sourced, so the demo never goes silent. Without the LLM the background
 * is not woven in, so it stays unexplained for the next story.
 */
export function factsStory(
  place: Place,
  pick: FactPick,
  sources: readonly PlaceSource[] = place.sources,
  words = Number.POSITIVE_INFINITY,
): StoryDraft {
  const intro = pick.recap ? `Znowu mijamy: ${place.name}.` : `Mijamy: ${place.name}.`;
  const told: StoryFact[] = [];
  let used = wordCount(intro);
  for (const fact of pick.facts) {
    const n = wordCount(fact.text);
    if (told.length > 0 && used + n > words) break;
    told.push(fact);
    used += n;
  }
  const text = cleanForSpeech([intro, ...told.map((f) => f.text)].join(" "));
  return { text, sources: [...sources], usedIds: told.map((f) => f.id) };
}

/**
 * Pulls the `text` value out of the model's JSON while it is still arriving, so the voice can
 * start on the first sentence. `push` returns the newly decoded characters.
 */
export function createStoryTextReader() {
  let raw = "";
  let state: "seek" | "text" | "done" = "seek";
  let pos = 0;
  const ESCAPES: Record<string, string> = { n: " ", t: " ", r: "", b: "", f: "" };

  return {
    get raw() {
      return raw;
    },
    push(delta: string): string {
      raw += delta;
      if (state === "seek") {
        const start = /"text"\s*:\s*"/.exec(raw);
        if (!start) return "";
        state = "text";
        pos = start.index + start[0].length;
      }
      let out = "";
      while (state === "text" && pos < raw.length) {
        const ch = raw[pos] as string;
        if (ch === '"') {
          state = "done";
          break;
        }
        if (ch !== "\\") {
          out += ch;
          pos += 1;
          continue;
        }
        // An escape split across two deltas waits for the rest.
        const next = raw[pos + 1];
        if (next === undefined) break;
        if (next === "u") {
          if (pos + 6 > raw.length) break;
          out += String.fromCharCode(Number.parseInt(raw.slice(pos + 2, pos + 6), 16));
          pos += 6;
          continue;
        }
        out += ESCAPES[next] ?? next;
        pos += 2;
      }
      return out;
    },
  };
}
