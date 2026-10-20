import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { Mp3Encoder } from "@breezystack/lamejs";
import type { StoryLang } from "@sawa/shared";
import type { SpeechAudio } from "../../domain/speech";
import { AppError } from "../../lib/errors";
import type { SpeechSynthesizer } from "../../services/ports";

/**
 * Piper voices converted for sherpa-onnx, one per story language: "gosia" (Polish, female,
 * CC0 dataset) and "amy" (US English, female). About 70 MB each; they run on the API's CPU,
 * about 0.1 s per second of speech. Used when ElevenLabs is out of reach: no key, no credits,
 * timeout. An English story is never read with the Polish voice.
 */
export const PIPER_VOICES: Record<StoryLang, { model: string; onnx: string }> = {
  pl: { model: "vits-piper-pl_PL-gosia-medium", onnx: "pl_PL-gosia-medium.onnx" },
  en: { model: "vits-piper-en_US-amy-medium", onnx: "en_US-amy-medium.onnx" },
};
export const PIPER_MODEL = PIPER_VOICES.pl.model;
const LANGS = Object.keys(PIPER_VOICES) as StoryLang[];
const modelUrl = (model: string) =>
  `https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/${model}.tar.bz2`;
/** Close to Sawa's ElevenLabs tempo (speed 1.05). */
const SPEED = 1.05;
/** Mono speech at the model's 22.05 kHz; 64 kbps is plenty and keeps clips small. */
const MP3_KBPS = 64;
const MP3_BLOCK = 1152;

export const defaultPiperModelDir = () => join(tmpdir(), "sawa-tts", PIPER_MODEL);

type GeneratedAudio = { samples: Float32Array; sampleRate: number };
type OfflineTts = {
  generateAsync(request: { text: string; sid: number; speed: number }): Promise<GeneratedAudio>;
};

export type PiperOptions = {
  /**
   * Folder with the unpacked Polish model; the other voices sit next to it, in folders named
   * after their models. Each is downloaded there on first use when missing.
   */
  modelDir?: string;
};

export type PiperSynthesizer = SpeechSynthesizer & {
  /** Downloads and loads every voice now, so the first story does not wait for it. */
  warm(): Promise<void>;
};

/** Where the voice for `lang` is unpacked: next to the Polish one. */
export function piperModelDir(polishDir: string, lang: StoryLang): string {
  return lang === "pl" ? polishDir : join(dirname(polishDir), PIPER_VOICES[lang].model);
}

/** Float samples in [-1, 1] as one mp3, so clips join and play like ElevenLabs ones. */
export function encodeMp3(samples: Float32Array, sampleRate: number): Uint8Array<ArrayBuffer> {
  const encoder = new Mp3Encoder(1, sampleRate, MP3_KBPS);
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] as number));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const parts: Uint8Array[] = [];
  for (let at = 0; at < pcm.length; at += MP3_BLOCK) {
    parts.push(encoder.encodeBuffer(pcm.subarray(at, at + MP3_BLOCK)));
  }
  parts.push(encoder.flush());
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

async function download(modelDir: string, model: string): Promise<void> {
  const parent = dirname(modelDir);
  await mkdir(parent, { recursive: true });
  const archive = join(parent, `${model}.tar.bz2`);
  const run = promisify(execFile);
  try {
    await run("curl", ["-fsSL", "-o", archive, modelUrl(model)], { timeout: 300_000 });
    await run("tar", ["xjf", archive, "-C", parent], { timeout: 300_000 });
  } finally {
    await rm(archive, { force: true });
  }
}

export function createPiperSynthesizer(options: PiperOptions = {}): PiperSynthesizer {
  const polishDir = options.modelDir ?? defaultPiperModelDir();
  const loading = new Map<StoryLang, Promise<OfflineTts>>();
  // One clip at a time: the model uses the CPU fully, so a queue is as fast and keeps memory flat.
  let queue: Promise<unknown> = Promise.resolve();

  function load(lang: StoryLang): Promise<OfflineTts> {
    const loaded = loading.get(lang);
    if (loaded) return loaded;
    const { model, onnx } = PIPER_VOICES[lang];
    const modelDir = piperModelDir(polishDir, lang);
    const pending = (async () => {
      if (!existsSync(join(modelDir, onnx))) await download(modelDir, model);
      // Native addon, loaded only here: an API on a platform without it still starts.
      const { default: sherpa } = await import("sherpa-onnx-node");
      return sherpa.OfflineTts.createAsync({
        model: {
          vits: {
            model: join(modelDir, onnx),
            tokens: join(modelDir, "tokens.txt"),
            dataDir: join(modelDir, "espeak-ng-data"),
          },
          numThreads: 2,
          provider: "cpu",
        },
        maxNumSentences: 1,
      });
    })();
    loading.set(lang, pending);
    // A failed download or load is tried again on the next clip.
    pending.catch(() => loading.delete(lang));
    return pending;
  }

  async function say(text: string, lang: StoryLang = "pl"): Promise<SpeechAudio> {
    const run = queue.then(async () => {
      let tts: OfflineTts;
      try {
        tts = await load(lang);
      } catch (err) {
        // Never another language's voice: Polish sounds of English text are worse than no voice.
        throw new AppError("UPSTREAM_ERROR", `Local voice model unavailable (${lang})`, {
          cause: err,
        });
      }
      const { samples, sampleRate } = await tts.generateAsync({ text, sid: 0, speed: SPEED });
      return { audio: encodeMp3(samples, sampleRate), contentType: "audio/mpeg" };
    });
    queue = run.catch(() => undefined);
    return run;
  }

  return {
    async warm() {
      await Promise.all(LANGS.map(load));
    },
    synthesize: (text, opts) => say(text, opts?.lang),
    // Each sentence comes out whole; the speech service sends the next one while this one plays.
    async *stream(text, opts) {
      yield (await say(text, opts.lang)).audio;
    },
  };
}
