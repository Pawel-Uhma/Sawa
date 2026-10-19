import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { Mp3Encoder } from "@breezystack/lamejs";
import type { SpeechAudio } from "../../domain/speech";
import { AppError } from "../../lib/errors";
import type { SpeechSynthesizer } from "../../services/ports";

/**
 * Piper "gosia" (Polish, female, medium quality, CC0 dataset) converted for sherpa-onnx.
 * About 70 MB; runs on the API's CPU, about 0.1 s per second of speech. Used when ElevenLabs is
 * out of reach: no key, no credits, timeout.
 */
export const PIPER_MODEL = "vits-piper-pl_PL-gosia-medium";
const MODEL_URL = `https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/${PIPER_MODEL}.tar.bz2`;
const ONNX = "pl_PL-gosia-medium.onnx";
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
  /** Folder with the unpacked model; downloaded there on first use when missing. */
  modelDir?: string;
};

export type PiperSynthesizer = SpeechSynthesizer & {
  /** Downloads and loads the model now, so the first story does not wait for it. */
  warm(): Promise<void>;
};

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

async function download(modelDir: string): Promise<void> {
  const parent = dirname(modelDir);
  await mkdir(parent, { recursive: true });
  const archive = join(parent, `${PIPER_MODEL}.tar.bz2`);
  const run = promisify(execFile);
  try {
    await run("curl", ["-fsSL", "-o", archive, MODEL_URL], { timeout: 300_000 });
    await run("tar", ["xjf", archive, "-C", parent], { timeout: 300_000 });
  } finally {
    await rm(archive, { force: true });
  }
}

export function createPiperSynthesizer(options: PiperOptions = {}): PiperSynthesizer {
  const modelDir = options.modelDir ?? defaultPiperModelDir();
  let loading: Promise<OfflineTts> | undefined;
  // One clip at a time: the model uses the CPU fully, so a queue is as fast and keeps memory flat.
  let queue: Promise<unknown> = Promise.resolve();

  function load(): Promise<OfflineTts> {
    loading ??= (async () => {
      if (!existsSync(join(modelDir, ONNX))) await download(modelDir);
      // Native addon, loaded only here: an API on a platform without it still starts.
      const { default: sherpa } = await import("sherpa-onnx-node");
      return sherpa.OfflineTts.createAsync({
        model: {
          vits: {
            model: join(modelDir, ONNX),
            tokens: join(modelDir, "tokens.txt"),
            dataDir: join(modelDir, "espeak-ng-data"),
          },
          numThreads: 2,
          provider: "cpu",
        },
        maxNumSentences: 1,
      });
    })();
    // A failed download or load is tried again on the next clip.
    loading.catch(() => {
      loading = undefined;
    });
    return loading;
  }

  async function say(text: string): Promise<SpeechAudio> {
    const run = queue.then(async () => {
      let tts: OfflineTts;
      try {
        tts = await load();
      } catch (err) {
        throw new AppError("UPSTREAM_ERROR", "Local voice model unavailable", { cause: err });
      }
      const { samples, sampleRate } = await tts.generateAsync({ text, sid: 0, speed: SPEED });
      return { audio: encodeMp3(samples, sampleRate), contentType: "audio/mpeg" };
    });
    queue = run.catch(() => undefined);
    return run;
  }

  return {
    async warm() {
      await load();
    },
    synthesize: say,
    // Each sentence comes out whole; the speech service sends the next one while this one plays.
    async *stream(text) {
      yield (await say(text)).audio;
    },
  };
}
