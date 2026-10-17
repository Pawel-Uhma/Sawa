import { factId } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { contextFor, STORY_CONTEXTS } from "./contexts";
import type { Place } from "./place";
import {
  bandFor,
  factsStory,
  parseStoryAnswer,
  pickFacts,
  placeFacts,
  storyCacheKey,
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
    [10, "short"],
    [30, "short"],
    [31, "medium"],
    [75, "medium"],
    [600, "long"],
  ])("%i s → %s", (sec, band) => {
    expect(bandFor(sec).id).toBe(band);
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
    const pick = pickFacts(place, { heard: [], band: { id: "short", upToSec: 5, words: 2 } });
    expect(pick.facts).toHaveLength(1);
  });

  it("ids facts by their text", () => {
    expect(placeFacts(place)[0]?.id).toBe(factId("Kercelak był największym bazarem Warszawy."));
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
    const pick = pickFacts(place, { heard: [], band: { id: "short", upToSec: 30, words: 8 } });
    const draft = factsStory(place, pick);
    expect(draft.text).toBe("Mijamy: Kercelak. Kercelak był największym bazarem Warszawy.");
    expect(draft.sources).toEqual(place.sources);
  });
});
