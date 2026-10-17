import { normalizeSpeechText, type SpeechAudio } from "../domain/speech";
import { AppError } from "../lib/errors";
import type { SpeechSynthesizer } from "./ports";

/** Each clip costs credits; the demo replays the same stories, so they are kept in memory. */
const MAX_CACHED_CLIPS = 200;

export type SpeechService = {
  speak(text: string): Promise<SpeechAudio>;
};

export function createSpeechService(synthesizer: SpeechSynthesizer): SpeechService {
  const cache = new Map<string, Promise<SpeechAudio>>();

  return {
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
      cache.set(key, pending);
      pending.catch(() => cache.delete(key));
      if (cache.size > MAX_CACHED_CLIPS) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
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
  };
}
