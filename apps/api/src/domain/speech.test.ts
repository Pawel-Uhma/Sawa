import { describe, expect, it } from "vitest";
import { normalizeSpeechText } from "./speech";

describe("normalizeSpeechText", () => {
  it("collapses whitespace and line breaks into single spaces", () => {
    expect(normalizeSpeechText("  Po prawej\n\nPałac   Kultury.\t")).toBe(
      "Po prawej Pałac Kultury.",
    );
  });

  it("keeps punctuation that shapes the pauses", () => {
    expect(normalizeSpeechText("Ja tam wolę Wisłę… w Bałtyku jest za zimno.")).toBe(
      "Ja tam wolę Wisłę… w Bałtyku jest za zimno.",
    );
  });
});
