import { AppError } from "../../lib/errors";
import type { SpeechSynthesizer } from "../../services/ports";

const ENDPOINT = "https://api.elevenlabs.io/v1/text-to-speech";
const TIMEOUT_MS = 30_000;
const OUTPUT_FORMAT = "mp3_44100_128";

/** Asia, a native Polish voice from the ElevenLabs library, picked by ear in the voice tuner. */
export const SAWA_VOICE_ID = "Bz1e1clEKwgN71Vx7cxj";
/** Multilingual v2 reads Polish most steadily; it detects the language itself. */
export const SAWA_MODEL_ID = "eleven_multilingual_v2";
/** Tuned on 17.10: lively rather than newsreader-flat, a bit faster than default. */
export const SAWA_VOICE_SETTINGS = {
  stability: 0.3,
  similarity_boost: 0.7,
  style: 0.9,
  speed: 1.05,
  use_speaker_boost: true,
} as const;

export type ElevenLabsOptions = {
  apiKey: string;
  voiceId?: string;
  modelId?: string;
};

export function createElevenLabsSynthesizer(options: ElevenLabsOptions): SpeechSynthesizer {
  const voiceId = options.voiceId ?? SAWA_VOICE_ID;
  const modelId = options.modelId ?? SAWA_MODEL_ID;

  return {
    async synthesize(text) {
      let res: Response;
      try {
        res = await fetch(`${ENDPOINT}/${voiceId}?output_format=${OUTPUT_FORMAT}`, {
          method: "POST",
          headers: {
            "xi-api-key": options.apiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({ text, model_id: modelId, voice_settings: SAWA_VOICE_SETTINGS }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "TimeoutError") {
          throw new AppError("UPSTREAM_TIMEOUT", "Speech synthesis timed out", { cause: err });
        }
        throw new AppError("UPSTREAM_ERROR", "Speech synthesis unreachable", { cause: err });
      }
      if (!res.ok) {
        // The body explains quota and permission errors; it never contains the key.
        const detail = (await res.text()).slice(0, 300);
        throw new AppError("UPSTREAM_ERROR", `ElevenLabs answered ${res.status}: ${detail}`);
      }
      return {
        audio: new Uint8Array(await res.arrayBuffer()),
        contentType: res.headers.get("content-type") ?? "audio/mpeg",
      };
    },
  };
}
