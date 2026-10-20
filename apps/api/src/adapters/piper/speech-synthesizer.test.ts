import { describe, expect, it } from "vitest";
import { mp3DurationSec } from "../../domain/word-times";
import { encodeMp3, PIPER_VOICES, piperModelDir } from "./speech-synthesizer";

describe("encodeMp3", () => {
  it("turns model samples into an mp3 of the same length", () => {
    const rate = 22_050;
    const samples = new Float32Array(rate * 2).map((_, i) => 0.3 * Math.sin(i / 10));
    const mp3 = encodeMp3(samples, rate);
    const seconds = mp3DurationSec(mp3);
    expect(seconds).not.toBeNull();
    expect(seconds).toBeGreaterThan(1.9);
    expect(seconds).toBeLessThan(2.2);
  });
});

describe("piperModelDir", () => {
  it("keeps the Polish voice where it is and puts the English one next to it", () => {
    expect(piperModelDir("/models/vits-piper-pl_PL-gosia-medium", "pl")).toBe(
      "/models/vits-piper-pl_PL-gosia-medium",
    );
    expect(piperModelDir("/models/vits-piper-pl_PL-gosia-medium", "en")).toBe(
      `/models/${PIPER_VOICES.en.model}`,
    );
    expect(PIPER_VOICES.en.onnx).toMatch(/^en_/);
  });
});
