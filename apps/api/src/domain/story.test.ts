import { describe, expect, it } from "vitest";
import type { Place } from "./place";
import { bandFor, factsStory, parseStoryAnswer, storyCacheKey } from "./story";

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

describe("factsStory", () => {
  it("names the place and stays within the band", () => {
    const draft = factsStory(place, { id: "short", upToSec: 30, words: 8 });
    expect(draft.text).toBe("Mijamy: Kercelak. Kercelak był największym bazarem Warszawy.");
    expect(draft.sources).toEqual(place.sources);
  });
});
