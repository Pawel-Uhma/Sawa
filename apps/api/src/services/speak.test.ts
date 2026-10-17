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
