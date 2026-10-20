import type { StoryLang } from "@sawa/shared";
import { spellNumbersEn } from "./spoken-english";
import { spellNumbers } from "./spoken-numbers";
import { cleanForSpeech } from "./story";

/** Synthesized speech ready to send to the client. */
export type SpeechAudio = {
  audio: Uint8Array<ArrayBuffer>;
  contentType: string;
};

/**
 * Text as it goes to TTS and as the cache key: same words with different spacing are one clip.
 * Line breaks become spaces because ElevenLabs reads a newline as a long pause, and numbers in
 * digits (years, house numbers, amounts) and abbreviations ("ul.", "godz.") become words
 * because it reads them badly in Polish. In English only decades and ordinals ("1930s", "20th")
 * are spelled out; other digits it reads well.
 */
export function normalizeSpeechText(text: string, lang: StoryLang = "pl"): string {
  const spaced = text.replace(/\s+/g, " ").trim();
  return lang === "en" ? spellNumbersEn(spaced) : spellNumbers(spaced);
}

/** Abbreviations that never end a sentence: the dot after them is not a place to cut. */
const NOT_SENTENCE_END =
  /(?<![\p{L}.])(?:ul|al|pl|godz|im|św|ks|gen|tzw|m\.in|ok|nr|np|tj|ds|prof|dr|płk|ppłk|kpt|por|mjr|r|w)\.$/iu;

/**
 * Whether the text can be cut after `before` when `after` follows. Not after an abbreviation
 * ("ul. Wolska", "XIX w. powstał"), not before a lowercase word ("2. połowa") and not between
 * an ordinal and a Roman century ("lata 30. XX wieku"): each is one sentence for the voice.
 */
function isCut(before: string, after: string): boolean {
  const end = before.trimEnd();
  if (NOT_SENTENCE_END.test(end)) return false;
  // The next word has not arrived yet: a short number with a dot may be an ordinal, so wait.
  if (!after) return !/(?<!\d)\d{1,2}\.$/.test(end);
  if (/^\p{Ll}/u.test(after)) return false;
  if (/\d\.$/.test(end) && /^[IVX]{1,6}\s/u.test(after)) return false;
  return true;
}

/** The first chunk is short so the voice starts soon; later ones are longer for steadier prosody. */
const FIRST_CHUNK_CHARS = 40;
const NEXT_CHUNK_CHARS = 160;

/**
 * One piece of a story for TTS: `display` as the screen shows it (`cleanForSpeech`, so the
 * pieces' words add up to the story's words), `spoken` as the voice gets it.
 */
export type SpeechChunk = { display: string; spoken: string };

/**
 * Cuts text arriving in pieces into whole sentences for TTS: never mid-sentence, and only once a
 * chunk is long enough. `flush` returns what is left when the text ends.
 */
export function createSentenceChunker(lang: StoryLang = "pl") {
  let buffer = "";
  let first = true;
  const clean = (text: string): SpeechChunk | null => {
    const display = cleanForSpeech(text);
    return display ? { display, spoken: normalizeSpeechText(display, lang) } : null;
  };

  return {
    push(text: string): SpeechChunk[] {
      buffer += text;
      const chunks: SpeechChunk[] = [];
      while (true) {
        const min = first ? FIRST_CHUNK_CHARS : NEXT_CHUNK_CHARS;
        const ends = /[.!?…]+["”»]?\s+/g;
        let cut = -1;
        for (let m = ends.exec(buffer); m; m = ends.exec(buffer)) {
          const end = m.index + m[0].length;
          if (end >= min && isCut(buffer.slice(0, end), buffer.slice(end))) {
            cut = end;
            break;
          }
        }
        if (cut < 0) break;
        const chunk = clean(buffer.slice(0, cut));
        buffer = buffer.slice(cut);
        if (chunk) chunks.push(chunk);
        first = false;
      }
      return chunks;
    },
    flush(): SpeechChunk | null {
      const rest = clean(buffer);
      buffer = "";
      return rest;
    },
  };
}
