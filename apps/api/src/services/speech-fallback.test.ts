import { describe, expect, it, vi } from "vitest";
import { AppError } from "../lib/errors";
import type { SpeechSynthesizer, TimedSpeech } from "./ports";
import { createFallbackSynthesizer, MAIN_VOICE_REST_MS } from "./speech-fallback";

const bytes = (s: string) => new TextEncoder().encode(s);
const text = (b: Uint8Array) => new TextDecoder().decode(b);

/** What `synth.stream` gives for `t`, as text. */
async function collect(synth: SpeechSynthesizer, t: string) {
  const out: string[] = [];
  for await (const b of synth.stream?.(t, { previousText: "" }) ?? []) out.push(text(b));
  return out;
}

function timedOf(synth: SpeechSynthesizer, t: string) {
  const timed = synth.streamWithTimes?.(t, { previousText: "" });
  if (!timed) throw new Error("no streamWithTimes");
  return timed[Symbol.asyncIterator]();
}

function voice(name: string, fail = false): SpeechSynthesizer {
  return {
    synthesize: vi.fn(async (t: string) => {
      if (fail) throw new AppError("UPSTREAM_ERROR", `${name} refused`);
      return { audio: bytes(`${name}:${t}`), contentType: "audio/mpeg" };
    }),
    stream: vi.fn(async function* (t: string) {
      if (fail) throw new AppError("UPSTREAM_ERROR", `${name} refused`);
      yield bytes(`${name}:${t}`);
    }),
  };
}

describe("createFallbackSynthesizer", () => {
  it("uses the main voice while it works", async () => {
    const main = voice("eleven");
    const backup = voice("piper");
    const synth = createFallbackSynthesizer(main, backup);
    expect(text((await synth.synthesize("Cześć")).audio)).toBe("eleven:Cześć");
    expect(await collect(synth, "Hej")).toEqual(["eleven:Hej"]);
    expect(backup.synthesize).not.toHaveBeenCalled();
  });

  it("reads with the backup when the main voice fails, and rests the main one", async () => {
    let clock = 0;
    const main = voice("eleven", true);
    const backup = voice("piper");
    const onFallback = vi.fn();
    const synth = createFallbackSynthesizer(main, backup, { onFallback, now: () => clock });
    expect(text((await synth.synthesize("Cześć")).audio)).toBe("piper:Cześć");
    expect(await collect(synth, "Hej")).toEqual(["piper:Hej"]);
    // Resting: the second ask does not try the main voice again.
    expect(main.stream).not.toHaveBeenCalled();
    expect(onFallback).toHaveBeenCalledTimes(1);
    clock += MAIN_VOICE_REST_MS;
    await synth.synthesize("Znowu");
    expect(main.synthesize).toHaveBeenCalledTimes(2);
  });

  it("does not read a clip twice when the main voice breaks mid-way", async () => {
    const main: SpeechSynthesizer = {
      synthesize: vi.fn(),
      async *stream() {
        yield bytes("eleven:pół");
        throw new AppError("UPSTREAM_ERROR", "cut");
      },
    };
    const backup = voice("piper");
    const synth = createFallbackSynthesizer(main, backup);
    const out: string[] = [];
    await expect(async () => {
      for await (const b of synth.stream?.("Hej", { previousText: "" }) ?? []) out.push(text(b));
    }).rejects.toThrow("cut");
    expect(out).toEqual(["eleven:pół"]);
    expect(backup.stream).not.toHaveBeenCalled();
  });

  it("refuses timed speech while the main voice rests, so the plain stream takes over", async () => {
    const main: SpeechSynthesizer = {
      ...voice("eleven", true),
      // biome-ignore lint/correctness/useYield: always fails
      async *streamWithTimes(): AsyncGenerator<TimedSpeech> {
        throw new AppError("UPSTREAM_ERROR", "no credits");
      },
    };
    const synth = createFallbackSynthesizer(main, voice("piper"));
    await expect(timedOf(synth, "Hej").next()).rejects.toThrow("no credits");
    await expect(timedOf(synth, "Hej").next()).rejects.toThrow("resting");
    expect(await collect(synth, "Hej")).toEqual(["piper:Hej"]);
  });
});
