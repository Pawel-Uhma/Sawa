import { describe, expect, it } from "vitest";
import { mp3DurationSec } from "../../domain/word-times";
import { encodeMp3 } from "./speech-synthesizer";

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
