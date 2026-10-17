import { factId } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { contextFor, STORY_CONTEXTS } from "./contexts";
import type { Place } from "./place";
import type { Finding } from "./research";
import {
  bandFor,
  createStoryTextReader,
  factsStory,
  findingSources,
  fitWords,
  isGentleForKids,
  parseStoryAnswer,
  pickFacts,
  placeFacts,
  storyCacheKey,
  storyWords,
  WORDS_PER_SEC,
} from "./story";

const place = {
  id: "kercelak",
  name: "Kercelak",
  facts: ["Kercelak był największym bazarem Warszawy.", "Spłonął w czasie Powstania."],
  trivia: ["Mówiono, że można tu kupić wszystko."],
  sources: [
    { id: "s1", title: "Wikipedia: Kercelak", url: "https://pl.wikipedia.org/wiki/Kercelak" },
    { id: "s2", title: "Warszawikia", url: "https://warszawa.fandom.com/wiki/Kercelak" },
  ],
} as Place;

const bowie: Finding = {
  text: "Bowie podobno wysiadł tu z pociągu w 1976 roku i kupił płytę zespołu Śląsk.",
  url: "https://stacjamuranow.pl/pl/mural-bowiego/",
  title: "Mural Bowiego - Stacja Muranów",
};

describe("bandFor", () => {
  it.each([
    [10, "20s"],
    [45, "40s"],
    [59, "40s"],
    [119, "100s"],
    [179, "150s"],
    [600, "600s"],
  ])("%i s → %s", (sec, band) => {
    expect(bandFor(sec).id).toBe(band);
  });

  it("fits the window with a breath to spare", () => {
    for (const sec of [20, 45, 90, 200, 600]) {
      const band = bandFor(sec);
      expect(band.words / WORDS_PER_SEC).toBeLessThanOrEqual(Math.max(sec, 20));
      expect(band.words / WORDS_PER_SEC).toBeGreaterThan(sec * 0.5);
    }
  });
});

describe("storyCacheKey", () => {
  it("ignores the order of interests", () => {
    const band = bandFor(40);
    expect(storyCacheKey("a", ["nature", "historical"], band)).toBe(
      storyCacheKey("a", ["historical", "nature"], band),
    );
  });
});

describe("parseStoryAnswer", () => {
  it("keeps the cited sources only", () => {
    const draft = parseStoryAnswer(
      '{"text":"Tu był bazar.","usedIds":["a1"],"sourceIds":["s2"]}',
      place.sources,
    );
    expect(draft).toEqual({ text: "Tu był bazar.", sources: [place.sources[1]], usedIds: ["a1"] });
  });

  it("falls back to all sources when the ids are unknown", () => {
    const draft = parseStoryAnswer('{"text":"Tu był bazar.","sourceIds":["s9"]}', place.sources);
    expect(draft?.sources).toEqual(place.sources);
  });

  it("reads JSON wrapped in a code fence and strips markdown", () => {
    const draft = parseStoryAnswer('```json\n{"text":"**Tu** był\\n bazar."}\n```', place.sources);
    expect(draft?.text).toBe("Tu był bazar.");
  });

  it.each(["not json", '{"text":""}', '{"sourceIds":[]}', "null"])("rejects %s", (raw) => {
    expect(parseStoryAnswer(raw, place.sources)).toBeNull();
  });
});

describe("pickFacts", () => {
  const medium = bandFor(60);
  const [first, trivia, second] = placeFacts(place).map((f) => f.id);

  it("offers what the place is, then the trivia, then the other facts", () => {
    const pick = pickFacts(place, { heard: [], band: medium });
    expect(pick.facts.map((f) => f.id)).toEqual([first, trivia, second]);
    expect(pick.recap).toBe(false);
  });

  it("puts stories from the web before everything else, citing their page", () => {
    const pick = pickFacts(place, { heard: [], band: medium, findings: [bowie] });
    expect(pick.facts[0]).toMatchObject({ kind: "story", text: bowie.text, sourceId: "w1" });
  });

  it("skips what the listener already heard", () => {
    const pick = pickFacts(place, { heard: [first ?? ""], band: medium });
    expect(pick.facts.map((f) => f.id)).toEqual([trivia, second]);
  });

  it("recalls one line when everything was heard", () => {
    const pick = pickFacts(place, { heard: [first, second, trivia] as string[], band: medium });
    expect(pick).toEqual({ facts: [placeFacts(place)[0]], recap: true });
  });

  it("offers one or two lines in the trivia style", () => {
    const pick = pickFacts(place, { heard: [], band: medium, style: "trivia" });
    expect(pick.facts.length).toBeLessThanOrEqual(2);
  });

  it("keeps at least one fact even when the band is tiny", () => {
    const pick = pickFacts(place, { heard: [], band: { id: "5s", sec: 5, words: 2 } });
    expect(pick.facts).toHaveLength(1);
  });

  it("ids facts by their text", () => {
    expect(placeFacts(place)[0]?.id).toBe(factId("Kercelak był największym bazarem Warszawy."));
  });
});

describe("fitWords", () => {
  const pick = (texts: string[]) => ({
    facts: texts.map((text) => ({ id: factId(text), text, kind: "fact" as const })),
    recap: false,
  });

  it("keeps a story with one thin fact short instead of padding it", () => {
    expect(fitWords(140, pick(["Autor: Dawid Celek."]))).toBe(25);
  });

  it("grows with the material up to the limit", () => {
    const long = Array.from({ length: 60 }, () => "słowo").join(" ");
    expect(fitWords(140, pick([long]))).toBe(96);
    expect(fitWords(140, pick([long, long]))).toBe(140);
  });

  it("adds the room for the background", () => {
    expect(fitWords(140, pick(["Autor: Dawid Celek."]), 50)).toBe(55);
  });
});

describe("findingSources", () => {
  it("gives each page one source id", () => {
    const other = { ...bowie, text: "Mural odsłonięto w 2016 roku." };
    expect(findingSources([bowie, other])).toEqual([
      { id: "w1", title: bowie.title, url: bowie.url },
    ]);
  });
});

describe("storyWords", () => {
  const band = bandFor(60);

  it("gives a child a shorter story than an adult", () => {
    const kids = storyWords(band, "deep", false, "kids");
    expect(kids).toBeLessThan(storyWords(band, "deep", false, "adult"));
    expect(storyWords(band, "deep", false)).toBe(band.words);
  });

  it("keeps trivia and reminders short for everyone", () => {
    expect(storyWords(band, "trivia", false, "kids")).toBe(storyWords(band, "trivia", false));
  });
});

describe("isGentleForKids", () => {
  it("marks war and the ghetto, not the rest", () => {
    expect(isGentleForKids({ interests: ["architecture", "war_uprising"] })).toBe(true);
    expect(isGentleForKids({ interests: ["jewish_warsaw"] })).toBe(true);
    expect(isGentleForKids({ interests: ["nature", "sport"] })).toBe(false);
  });
});

describe("contextFor", () => {
  const uprising = { interests: ["war_uprising", "architecture"] };

  it("explains the background once, and only to first-timers", () => {
    expect(contextFor(uprising, "first_time", [])?.id).toBe("powstanie-1944");
    expect(contextFor(uprising, "first_time", ["powstanie-1944"])).toBeNull();
    expect(contextFor(uprising, "local", [])).toBeNull();
    expect(contextFor({ interests: ["nature"] }, "first_time", [])).toBeNull();
  });

  it("has a unique id per background", () => {
    expect(new Set(STORY_CONTEXTS.map((c) => c.id)).size).toBe(STORY_CONTEXTS.length);
  });
});

describe("factsStory", () => {
  it("names the place and reads as many picked lines as fit", () => {
    const pick = pickFacts(place, { heard: [], band: bandFor(60) });
    const draft = factsStory(place, pick, place.sources, 12);
    expect(draft.text).toBe("Mijamy: Kercelak. Kercelak był największym bazarem Warszawy.");
    expect(draft.usedIds).toEqual([pick.facts[0]?.id]);
    expect(draft.sources).toEqual(place.sources);
  });
});

describe("createStoryTextReader", () => {
  it("reads the text value while the JSON arrives, escapes split across pieces included", () => {
    const raw = '```json\n{"text": "Bowie \\u017cy\\"ł\\" tu.\\nKoniec", "usedIds": ["a"]}';
    const reader = createStoryTextReader();
    let text = "";
    for (const ch of raw) text += reader.push(ch);
    expect(text).toBe('Bowie ży"ł" tu. Koniec');
    expect(reader.raw).toBe(raw);
  });
});
