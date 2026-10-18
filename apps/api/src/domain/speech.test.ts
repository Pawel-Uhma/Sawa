import { describe, expect, it } from "vitest";
import { createSentenceChunker, normalizeSpeechText } from "./speech";

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

describe("createSentenceChunker", () => {
  const first = "Bowie podobno wysiadł tu z pociągu na spacer. ";
  const rest = "Kupił płytę zespołu Śląsk i wrócił do Berlina. Rok później nagrał utwór Warszawa. ";

  it("cuts whole sentences only, the first one early and later ones longer", () => {
    const chunker = createSentenceChunker();
    const chunks: string[] = [];
    for (const ch of `${first}${rest}Koniec`) chunks.push(...chunker.push(ch).map((c) => c.spoken));
    expect(chunks).toEqual([first.trim()]);
    expect(chunker.flush()?.spoken).toBe(`${rest}Koniec`.trim());
  });

  it("strips markdown and returns null when nothing is left", () => {
    const chunker = createSentenceChunker();
    expect(chunker.push("**Krótko**")).toEqual([]);
    expect(chunker.flush()).toEqual({ display: "Krótko", spoken: "Krótko" });
    expect(chunker.flush()).toBeNull();
  });

  it("keeps the text for the screen next to the text for the voice", () => {
    const chunker = createSentenceChunker();
    const [chunk] = chunker.push("W 1648 roku założyli tu jurydykę, https://x.pl/a. Dalej ");
    expect(chunk?.display).toBe("W 1648 roku założyli tu jurydykę,");
    expect(chunk?.spoken).toBe("W tysiąc sześćset czterdziestym ósmym roku założyli tu jurydykę,");
  });
});

describe("normalizeSpeechText with years", () => {
  it("spells out years in digits for the voice", () => {
    expect(normalizeSpeechText("W 1648 roku założyli tu jurydykę.")).toBe(
      "W tysiąc sześćset czterdziestym ósmym roku założyli tu jurydykę.",
    );
  });
});

describe("normalizeSpeechText in English", () => {
  it("keeps the digits, which the voice reads well in English", () => {
    expect(normalizeSpeechText("Built  in 1648,\n70 000 people.", "en")).toBe(
      "Built in 1648, 70 000 people.",
    );
  });

  it("chunks without spelling the numbers out", () => {
    const chunker = createSentenceChunker("en");
    expect(chunker.push("On the left there is a church built in 1648. ")[0]?.spoken).toBe(
      "On the left there is a church built in 1648.",
    );
  });
});
