import { describe, expect, it, vi } from "vitest";
import { createFakePlacesRepository } from "../adapters/supabase/fake-places-repository";
import { AppError } from "../lib/errors";
import type { LlmProvider } from "./ports";
import type { PlaceResearch } from "./research-place";
import { createStoryService } from "./tell-story";

const places = createFakePlacesRepository();

async function anyPlace() {
  const [first] = await places.listInBBox({ minLng: -180, minLat: -90, maxLng: 180, maxLat: 90 });
  if (!first) throw new Error("fake repository is empty");
  return first.id;
}

function fakeLlm(answer = '{"text":"Zaraz mijamy coś ciekawego.","sourceIds":[]}') {
  const complete = vi.fn<LlmProvider["complete"]>(async () => answer);
  return { model: "fake", complete };
}

describe("createStoryService", () => {
  it("tells the LLM's story with the place's facts in the prompt", async () => {
    const placeId = await anyPlace();
    const place = await places.getById(placeId);
    const llm = fakeLlm();
    const story = await createStoryService({ places, llm }).tell({
      placeId,
      interests: ["historical"],
      targetSec: 40,
    });

    expect(story).toMatchObject({ placeId, text: "Zaraz mijamy coś ciekawego.", cached: false });
    const { user } = llm.complete.mock.calls[0]?.[0] ?? { user: "" };
    expect(user).toContain(place?.facts[0]);
    expect(user).toContain("historia");
  });

  it("tells what the listener has not heard yet and says which facts it told", async () => {
    const placeId = await anyPlace();
    const service = createStoryService({ places });
    const first = await service.tell({ placeId, targetSec: 20 });
    expect(first.factIds.length).toBeGreaterThan(0);
    expect(first.recap).toBe(false);

    const second = await service.tell({ placeId, targetSec: 20, heardFacts: first.factIds });
    expect(second.factIds.some((id) => first.factIds.includes(id))).toBe(false);
  });

  it("tells stories found on the web first and cites their page", async () => {
    const placeId = await anyPlace();
    const finding = {
      text: "Bowie podobno kupił tu płytę zespołu Śląsk.",
      url: "https://stacjamuranow.pl/pl/mural-bowiego/",
      title: "Mural Bowiego",
    };
    const research: PlaceResearch = { find: vi.fn(async () => [finding]) };
    const llm = fakeLlm('{"text":"Bowie kupił tu płytę.","sourceIds":["w1"]}');
    const story = await createStoryService({ places, llm, research }).tell({
      placeId,
      targetSec: 60,
    });

    const { user } = llm.complete.mock.calls[0]?.[0] ?? { user: "" };
    expect(user.indexOf(finding.text)).toBeLessThan(user.indexOf("fakt:"));
    expect(user).toContain("w1: Mural Bowiego");
    expect(story.sources).toEqual([{ id: "w1", title: finding.title, url: finding.url }]);
  });

  it("remembers only the lines the model says it told", async () => {
    const placeId = await anyPlace();
    const service = createStoryService({ places });
    const all = (await service.tell({ placeId, targetSec: 600 })).factIds;
    const llm = fakeLlm(JSON.stringify({ text: "Krótko.", usedIds: [all[1], "zmyslone"] }));
    const story = await createStoryService({ places, llm }).tell({ placeId, targetSec: 600 });
    expect(story.factIds).toEqual([all[1]]);
  });

  it("asks for a short story when there is little to tell", async () => {
    const placeId = await anyPlace();
    const llm = fakeLlm();
    await createStoryService({ places, llm }).tell({ placeId, targetSec: 600 });
    const { user } = llm.complete.mock.calls[0]?.[0] ?? { user: "" };
    const words = Number(user.match(/najwyżej (\d+) słów/)?.[1]);
    expect(words).toBeGreaterThan(0);
    expect(words).toBeLessThanOrEqual(230);
  });

  it("explains the background to a first-timer once", async () => {
    const all = await places.listInBBox({ minLng: -180, minLat: -90, maxLng: 180, maxLat: 90 });
    const uprising = all.find((p) => p.interests.includes("war_uprising"));
    if (!uprising) throw new Error("no uprising place in the fake repository");
    const llm = fakeLlm();
    const service = createStoryService({ places, llm });
    const ask = (knownContexts: string[]) =>
      service.tell({
        placeId: uprising.id,
        targetSec: 60,
        familiarity: "first_time",
        knownContexts,
      });

    expect((await ask([])).contextIds).toEqual(["powstanie-1944"]);
    expect(llm.complete.mock.calls[0]?.[0].user).toContain("pierwszy raz");
    expect((await ask(["powstanie-1944"])).contextIds).not.toContain("powstanie-1944");
    expect(llm.complete.mock.calls[1]?.[0].user).toContain("słyszał już ode mnie o");
  });

  it("asks once for the same place, interests and length band", async () => {
    const placeId = await anyPlace();
    const llm = fakeLlm();
    const service = createStoryService({ places, llm });
    await Promise.all([
      service.tell({ placeId, interests: ["historical", "cultural"], targetSec: 40 }),
      service.tell({ placeId, interests: ["cultural", "historical"], targetSec: 50 }),
    ]);
    const again = await service.tell({
      placeId,
      interests: ["historical", "cultural"],
      targetSec: 60,
    });
    expect(again.cached).toBe(true);
    expect(llm.complete).toHaveBeenCalledTimes(1);
  });

  it("falls back to the facts when the LLM fails, and retries next time", async () => {
    const placeId = await anyPlace();
    const llm = fakeLlm();
    llm.complete.mockRejectedValueOnce(new AppError("UPSTREAM_ERROR", "boom"));
    const onLlmError = vi.fn();
    const service = createStoryService({ places, llm, onLlmError });

    const first = await service.tell({ placeId, interests: [], targetSec: 20 });
    expect(first.text).toMatch(/^Mijamy: /);
    expect(onLlmError).toHaveBeenCalledOnce();

    const second = await service.tell({ placeId, interests: [], targetSec: 20 });
    expect(second.text).toBe("Zaraz mijamy coś ciekawego.");
  });

  it("treats an unusable answer as a failure", async () => {
    const placeId = await anyPlace();
    const story = await createStoryService({ places, llm: fakeLlm("nie json") }).tell({
      placeId,
      interests: [],
      targetSec: 20,
    });
    expect(story.text).toMatch(/^Mijamy: /);
  });

  it("answers NOT_FOUND for an unknown place", async () => {
    await expect(
      createStoryService({ places, llm: fakeLlm() }).tell({
        placeId: "nope",
        interests: [],
        targetSec: 20,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  describe("tellStream", () => {
    function streamingLlm(...pieces: string[]) {
      const stream = vi.fn(async function* () {
        yield* pieces;
      });
      return { ...fakeLlm(pieces.join("")), stream };
    }
    async function read(text: AsyncIterable<string>) {
      const out: string[] = [];
      for await (const piece of text) out.push(piece);
      return out;
    }

    it("gives the text in pieces as the model writes it, then the story", async () => {
      const placeId = await anyPlace();
      const llm = streamingLlm('{"text":"Bowie ', 'tu był.","usedIds":[]}');
      const told = await createStoryService({ places, llm }).tellStream({ placeId, targetSec: 30 });

      expect(await read(told.text)).toEqual(["Bowie ", "tu był."]);
      expect(await told.story).toMatchObject({ placeId, text: "Bowie tu był.", cached: false });
    });

    it("caches the streamed story for the next ask", async () => {
      const placeId = await anyPlace();
      const llm = streamingLlm('{"text":"Raz."}');
      const service = createStoryService({ places, llm });
      await read((await service.tellStream({ placeId, targetSec: 30 })).text);

      const again = await service.tellStream({ placeId, targetSec: 30 });
      expect(again.whole).toBe("Raz.");
      expect(await again.story).toMatchObject({ cached: true });
      expect(llm.stream).toHaveBeenCalledOnce();
    });

    it("reads the facts when the model fails before saying anything", async () => {
      const placeId = await anyPlace();
      const llm = streamingLlm();
      // biome-ignore lint/correctness/useYield: fails before the first piece
      llm.stream.mockImplementationOnce(async function* () {
        throw new AppError("UPSTREAM_ERROR", "boom");
      });
      const onLlmError = vi.fn();
      const told = await createStoryService({ places, llm, onLlmError }).tellStream({
        placeId,
        targetSec: 30,
      });

      const [text] = await read(told.text);
      expect(text).toMatch(/^Mijamy: /);
      expect((await told.story).text).toBe(text);
      expect(onLlmError).toHaveBeenCalledOnce();
    });
  });
});
