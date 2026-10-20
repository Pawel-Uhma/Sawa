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

describe("normalizeSpeechText with ordinals and abbreviations (#204)", () => {
  it.each([
    ["W latach 30. XX w. powstał dom.", "W latach trzydziestych dwudziestego wieku powstał dom."],
    ["Lata 30. XX wieku były trudne.", "Lata trzydzieste dwudziestego wieku były trudne."],
    ["2. połowa XIX w. to rozkwit.", "druga połowa dziewiętnastego wieku to rozkwit."],
    [
      "Dom stoi przy ul. Wolska 27/29.",
      "Dom stoi przy ulicy Wolska dwadzieścia siedem łamane przez dwadzieścia dziewięć.",
    ],
    ["ul. Wolska 27/29", "ulica Wolska dwadzieścia siedem łamane przez dwadzieścia dziewięć"],
    ["al. Solidarności", "aleja Solidarności"],
    ["Spotkanie o godz. 17:00.", "Spotkanie o godzinie siedemnastej."],
  ])("%s", (text, spoken) => {
    expect(normalizeSpeechText(text)).toBe(spoken);
  });

  it("inflects ordinals with a dot by the word they go with", () => {
    expect(normalizeSpeechText("w 2. połowie XIX w.")).toBe(
      "w drugiej połowie dziewiętnastego wieku.",
    );
    expect(normalizeSpeechText("W latach 20. i 30. XX wieku")).toBe(
      "W latach dwudziestych i trzydziestych dwudziestego wieku",
    );
    expect(normalizeSpeechText("Moda z lat 60. wróciła.")).toBe(
      "Moda z lat sześćdziesiątych wróciła.",
    );
    expect(normalizeSpeechText("Tak było w latach 60.")).toBe(
      "Tak było w latach sześćdziesiątych.",
    );
    expect(normalizeSpeechText("Mieszkał na 3. piętrze.")).toBe("Mieszkał na trzecim piętrze.");
    expect(normalizeSpeechText("Walczyła tu 1. Dywizja Pancerna.")).toBe(
      "Walczyła tu pierwsza Dywizja Pancerna.",
    );
  });

  it("keeps a number with a dot at the end of a sentence a number", () => {
    expect(normalizeSpeechText("Pokój ma numer 5. Potem")).toBe("Pokój ma numer pięć. Potem");
  });

  it("expands street abbreviations by case", () => {
    expect(normalizeSpeechText("Mieszkał przy ul. Wolskiej 5.")).toBe(
      "Mieszkał przy ulicy Wolskiej pięć.",
    );
    expect(normalizeSpeechText("Skręć w ul. Mokotowską.")).toBe("Skręć w ulicę Mokotowską.");
    expect(normalizeSpeechText("Al. Jerozolimskie")).toBe("Aleje Jerozolimskie");
    expect(normalizeSpeechText("w Al. Jerozolimskich")).toBe("w Alejach Jerozolimskich");
    expect(normalizeSpeechText("na pl. Zamkowym")).toBe("na placu Zamkowym");
    expect(normalizeSpeechText("pl. Bankowy")).toBe("plac Bankowy");
  });

  it("expands names and titles", () => {
    expect(normalizeSpeechText("Park im. Romualda Traugutta")).toBe(
      "Park imienia Romualda Traugutta",
    );
    expect(normalizeSpeechText("kościół św. Anny")).toBe("kościół świętej Anny");
    expect(normalizeSpeechText("kościół św. Krzyża")).toBe("kościół świętego Krzyża");
    expect(normalizeSpeechText("kościół św. Piotra i Pawła")).toBe(
      "kościół świętych Piotra i Pawła",
    );
    expect(normalizeSpeechText("grób ks. Jerzego Popiełuszki")).toBe(
      "grób księdza Jerzego Popiełuszki",
    );
    expect(normalizeSpeechText("gen. Władysław Anders")).toBe("generał Władysław Anders");
    expect(normalizeSpeechText("pomnik gen. Andersa")).toBe("pomnik generała Andersa");
    expect(normalizeSpeechText("tzw. Kercelak")).toBe("tak zwany Kercelak");
    expect(normalizeSpeechText("Są tu m.in. kościoły.")).toBe("Są tu między innymi kościoły.");
  });

  it("does not take a sentence end for an abbreviation", () => {
    expect(normalizeSpeechText("Pomógł im. Potem poszedł.")).toBe("Pomógł im. Potem poszedł.");
    expect(normalizeSpeechText("Strona sawa.pl. Dalej")).toBe("Strona sawa.pl. Dalej");
    expect(normalizeSpeechText("o godz. 9 rano")).toBe("o godzinie dziewiątej rano");
  });

  it("reads year ranges from one year to the other", () => {
    expect(normalizeSpeechText("w latach 1939–1945")).toBe(
      "w latach od tysiąc dziewięćset trzydziestego dziewiątego do tysiąc dziewięćset czterdziestego piątego",
    );
    expect(normalizeSpeechText("od 1939-1945")).toBe(
      "od tysiąc dziewięćset trzydziestego dziewiątego do tysiąc dziewięćset czterdziestego piątego",
    );
  });

  it("does not cut a sentence at an abbreviation or an ordinal", () => {
    const chunker = createSentenceChunker();
    const text =
      "Kamienica przy ul. Wolskiej powstała w latach 30. XX w. przy dawnym trakcie. Dalej ";
    expect(chunker.push(text).map((c) => c.spoken)).toEqual([
      "Kamienica przy ulicy Wolskiej powstała w latach trzydziestych dwudziestego wieku przy dawnym trakcie.",
    ]);
  });
});

describe("normalizeSpeechText in English", () => {
  it("spells out decades and ordinals", () => {
    expect(normalizeSpeechText("Rebuilt in the 1930s, in the 20th century.", "en")).toBe(
      "Rebuilt in the nineteen thirties, in the twentieth century.",
    );
    expect(normalizeSpeechText("the '60s, the 1900s, the 21st century", "en")).toBe(
      "the sixties, the nineteen hundreds, the twenty-first century",
    );
  });

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
