import { describe, expect, it, vi } from "vitest";
import { AppError } from "../lib/errors";
import type { SpeechSynthesizer } from "./ports";
import { createDisabledSpeechService, createSpeechService } from "./speak";

function fakeSynthesizer() {
  const synthesize = vi.fn<SpeechSynthesizer["synthesize"]>(async (text) => ({
    audio: new TextEncoder().encode(text),
    contentType: "audio/mpeg",
  }));
  return { synthesize };
}

describe("createSpeechService", () => {
  it("sends normalized text to the synthesizer", async () => {
    const synth = fakeSynthesizer();
    await createSpeechService(synth).speak("  Cześć,\n jestem Sawa. ");
    expect(synth.synthesize).toHaveBeenCalledWith("Cześć, jestem Sawa.");
  });

  it("pays once for the same text, even with different spacing", async () => {
    const synth = fakeSynthesizer();
    const service = createSpeechService(synth);
    await Promise.all([service.speak("Pałac Kultury"), service.speak("Pałac  Kultury")]);
    await service.speak("Pałac Kultury\n");
    expect(synth.synthesize).toHaveBeenCalledTimes(1);
  });

  it("retries after a failed synthesis instead of caching the error", async () => {
    const synth = fakeSynthesizer();
    synth.synthesize.mockRejectedValueOnce(new AppError("UPSTREAM_ERROR", "boom"));
    const service = createSpeechService(synth);
    await expect(service.speak("Wisła")).rejects.toThrow("boom");
    await expect(service.speak("Wisła")).resolves.toMatchObject({ contentType: "audio/mpeg" });
    expect(synth.synthesize).toHaveBeenCalledTimes(2);
  });
});

describe("createDisabledSpeechService", () => {
  it("fails with an upstream error naming the missing key", async () => {
    await expect(createDisabledSpeechService().speak("Cześć")).rejects.toThrow("ELEVENLABS_KEY");
  });
});

describe("speakStream", () => {
  async function* pieces(...texts: string[]) {
    yield* texts;
  }
  const decode = (parts: Uint8Array[]) => parts.map((p) => new TextDecoder().decode(p));

  function streamingSynthesizer() {
    const stream = vi.fn(async function* (text: string, _opts: { previousText: string }) {
      yield new TextEncoder().encode(`<${text}>`);
    });
    return { ...fakeSynthesizer(), stream };
  }

  it("reads sentence by sentence, telling TTS what was already said", async () => {
    const synth = streamingSynthesizer();
    const out: Uint8Array[] = [];
    const text = pieces("Bowie wysiadł tu z pociągu na krótki spacer. ", "Kupił płytę.");
    for await (const b of createSpeechService(synth).speakStream(text)) out.push(b);

    expect(decode(out)).toEqual([
      "<Bowie wysiadł tu z pociągu na krótki spacer.>",
      "<Kupił płytę.>",
    ]);
    expect(synth.stream.mock.calls[1]?.[1]).toEqual({
      previousText: "Bowie wysiadł tu z pociągu na krótki spacer.",
    });
  });

  it("keeps the whole story as one clip, so it plays again from the cache", async () => {
    const synth = streamingSynthesizer();
    const service = createSpeechService(synth);
    const whole = "Bowie wysiadł tu z pociągu na krótki spacer. Kupił płytę.";
    for await (const _ of service.speakStream(pieces(whole))) {
    }
    const again: Uint8Array[] = [];
    for await (const b of service.speakStream(pieces(whole), { whole })) again.push(b);
    expect(decode(again)).toEqual(["<Bowie wysiadł tu z pociągu na krótki spacer.><Kupił płytę.>"]);
    expect(synth.stream).toHaveBeenCalledTimes(2);
  });

  it("reads the whole text at once when the synthesizer cannot stream", async () => {
    const synth = fakeSynthesizer();
    const out: Uint8Array[] = [];
    for await (const b of createSpeechService(synth).speakStream(pieces("Hej. ", "Tu.")))
      out.push(b);
    expect(decode(out)).toEqual(["Hej. Tu."]);
  });
});
