import { AppError } from "../lib/errors";
import type { SpeechSynthesizer } from "./ports";

/** After a failure the main voice rests this long, so each sentence does not wait for it to fail. */
export const MAIN_VOICE_REST_MS = 5 * 60_000;

export type FallbackOptions = {
  /** Called once per failure that hands the voice to the backup. */
  onFallback?: (err: unknown) => void;
  now?: () => number;
};

/**
 * The main voice (ElevenLabs) with a backup (local Piper): when the main one fails before
 * its first byte (no credits, bad key, timeout), the same text is read by the backup, and the
 * main one is skipped for `MAIN_VOICE_REST_MS`. A clip already started is not read twice.
 */
export function createFallbackSynthesizer(
  main: SpeechSynthesizer,
  backup: SpeechSynthesizer,
  options: FallbackOptions = {},
): SpeechSynthesizer {
  const now = options.now ?? Date.now;
  let restUntil = 0;
  const resting = () => now() < restUntil;
  function failed(err: unknown) {
    restUntil = now() + MAIN_VOICE_REST_MS;
    options.onFallback?.(err);
  }

  async function* streamOf(
    synth: SpeechSynthesizer,
    text: string,
    opts: { previousText: string },
  ): AsyncGenerator<Uint8Array> {
    if (synth.stream) yield* synth.stream(text, opts);
    else yield (await synth.synthesize(text)).audio;
  }

  const timed = main.streamWithTimes?.bind(main);

  return {
    async synthesize(text) {
      if (!resting()) {
        try {
          return await main.synthesize(text);
        } catch (err) {
          failed(err);
        }
      }
      return backup.synthesize(text);
    },
    async *stream(text, opts) {
      if (!resting()) {
        let started = false;
        try {
          for await (const bytes of streamOf(main, text, opts)) {
            started = true;
            yield bytes;
          }
          return;
        } catch (err) {
          if (started) throw err;
          failed(err);
        }
      }
      yield* streamOf(backup, text, opts);
    },
    // Only the main voice has character times. Failing before the first piece sends the speech
    // service to `stream` for the rest of the story, and that one reads it with the backup.
    ...(timed && {
      async *streamWithTimes(text, opts) {
        if (resting()) throw new AppError("UPSTREAM_ERROR", "Main voice resting, backup reads");
        let started = false;
        try {
          for await (const piece of timed(text, opts)) {
            started = true;
            yield piece;
          }
        } catch (err) {
          if (!started) failed(err);
          throw err;
        }
      },
    }),
  };
}
