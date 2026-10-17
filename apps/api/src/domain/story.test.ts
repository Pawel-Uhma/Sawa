import { factId } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { contextFor, STORY_CONTEXTS } from "./contexts";
import type { Place } from "./place";
import {
  bandFor,
  factsStory,
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
    const draft = parseStoryAnswer('{"text":"Tu był bazar.","sourceIds":["s2"]}', place);
    expect(draft).toEqual({ text: "Tu był bazar.", sources: [place.sources[1]] });
  });

  it("falls back to all sources when the ids are unknown", () => {
    const draft = parseStoryAnswer('{"text":"Tu był bazar.","sourceIds":["s9"]}', place);
    expect(draft?.sources).toEqual(place.sources);
  });

  it("reads JSON wrapped in a code fence and strips markdown", () => {
    const draft = parseStoryAnswer('```json\n{"text":"**Tu** był\\n bazar."}\n```', place);
    expect(draft?.text).toBe("Tu był bazar.");
  });

  it.each(["not json", '{"text":""}', '{"sourceIds":[]}', "null"])("rejects %s", (raw) => {
    expect(parseStoryAnswer(raw, place)).toBeNull();
  });
});

describe("pickFacts", () => {
  const medium = bandFor(60);
  const [first, second, trivia] = placeFacts(place).map((f) => f.id);

  it("tells the facts in the seed's order, then the trivia", () => {
    const pick = pickFacts(place, { heard: [], band: medium });
    expect(pick.facts.map((f) => f.id)).toEqual([first, second, trivia]);
    expect(pick.recap).toBe(false);
  });

  it("skips what the listener already heard", () => {
    const pick = pickFacts(place, { heard: [first ?? ""], band: medium });
    expect(pick.facts.map((f) => f.id)).toEqual([second, trivia]);
  });

  it("recalls one fact when everything was heard", () => {
    const pick = pickFacts(place, { heard: [first, second, trivia] as string[], band: medium });
    expect(pick).toEqual({ facts: [placeFacts(place)[0]], recap: true });
  });

  it("starts with trivia in the trivia style", () => {
    const pick = pickFacts(place, { heard: [], band: medium, style: "trivia" });
    expect(pick.facts[0]?.kind).toBe("trivia");
  });

  it("keeps at least one fact even when the band is tiny", () => {
    const pick = pickFacts(place, { heard: [], band: { id: "5s", sec: 5, words: 2 } });
    expect(pick.facts).toHaveLength(1);
  });

  it("ids facts by their text", () => {
    expect(placeFacts(place)[0]?.id).toBe(factId("Kercelak był największym bazarem Warszawy."));
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
  it("names the place and reads the picked facts", () => {
    const pick = pickFacts(place, { heard: [], band: { id: "30s", sec: 30, words: 8 } });
    const draft = factsStory(place, pick);
    expect(draft.text).toBe("Mijamy: Kercelak. Kercelak był największym bazarem Warszawy.");
    expect(draft.sources).toEqual(place.sources);
  });
});
