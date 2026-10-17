import { describe, expect, it, vi } from "vitest";
import { createFakePlacesRepository } from "../adapters/supabase/fake-places-repository";
import { AppError } from "../lib/errors";
import type { LlmProvider } from "./ports";
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
});
