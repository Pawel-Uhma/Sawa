import { createSentenceChunker, normalizeSpeechText, type SpeechAudio } from "../domain/speech";
import { AppError } from "../lib/errors";
import type { SpeechSynthesizer } from "./ports";

/** Each clip costs credits; the demo replays the same stories, so they are kept in memory. */
const MAX_CACHED_CLIPS = 200;

export type SpeechService = {
  speak(text: string): Promise<SpeechAudio>;
  /**
   * Reads text that is still being written: each sentence goes to TTS as soon as it is whole, and
   * the mp3 comes out as it is made. A text heard before plays from the cache.
   */
  speakStream(text: AsyncIterable<string>, opts?: { whole?: string }): AsyncGenerator<Uint8Array>;
};

/** The pieces of one story as one mp3, for the cache. */
function joinAudio(parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

export function createSpeechService(synthesizer: SpeechSynthesizer): SpeechService {
  const cache = new Map<string, Promise<SpeechAudio>>();

  function remember(key: string, clip: Promise<SpeechAudio>) {
    cache.set(key, clip);
    clip.catch(() => cache.delete(key));
    if (cache.size > MAX_CACHED_CLIPS) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
  }

  return {
    async *speakStream(text, opts) {
      // A story told before is a whole clip in the cache.
      const hit =
        opts?.whole === undefined ? undefined : cache.get(normalizeSpeechText(opts.whole));
      if (hit) {
        yield (await hit).audio;
        return;
      }
      const stream = synthesizer.stream?.bind(synthesizer);
      const chunker = createSentenceChunker();
      const said: string[] = [];
      const parts: Uint8Array[] = [];
      // One request at a time: TTS makes audio faster than it plays, so the next sentence is
      // ready before the listener gets there, and the account's concurrency limit holds.
      async function* say(sentence: string) {
        if (!stream) return;
        for await (const bytes of stream(sentence, { previousText: said.join(" ").slice(-500) })) {
          parts.push(bytes);
          yield bytes;
        }
        said.push(sentence);
      }

      if (!stream) {
        let all = "";
        for await (const piece of text) all += piece;
        yield (await this.speak(all)).audio;
        return;
      }
      for await (const piece of text) {
        for (const sentence of chunker.push(piece)) yield* say(sentence);
      }
      const rest = chunker.flush();
      if (rest) yield* say(rest);
      if (parts.length) {
        remember(
          normalizeSpeechText(said.join(" ")),
          Promise.resolve({ audio: joinAudio(parts), contentType: "audio/mpeg" }),
        );
      }
    },
    speak(text) {
      const key = normalizeSpeechText(text);
      const hit = cache.get(key);
      if (hit) {
        // Re-insert so the Map's insertion order works as least-recently-used.
        cache.delete(key);
        cache.set(key, hit);
        return hit;
      }
      // The promise is cached, so two players asking at once pay for one clip.
      const pending = synthesizer.synthesize(key);
      remember(key, pending);
      return pending;
    },
  };
}

/** Used when ELEVENLABS_KEY is missing, so the rest of the API still runs. */
export function createDisabledSpeechService(): SpeechService {
  return {
    speak: async () => {
      throw new AppError("UPSTREAM_ERROR", "Speech is not configured (ELEVENLABS_KEY)");
    },
    // biome-ignore lint/correctness/useYield: fails before the first byte
    async *speakStream() {
      throw new AppError("UPSTREAM_ERROR", "Speech is not configured (ELEVENLABS_KEY)");
    },
  };
}
