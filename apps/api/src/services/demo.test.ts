import type { Route, Story } from "@sawa/shared";
import { describe, expect, it, vi } from "vitest";
import {
  createCachedRoutePlanner,
  createFixedDestinationSearch,
  createFixtureSynthesizer,
  createRecordingStoryService,
  createReplayStoryService,
  type FixtureStore,
} from "./demo";
import type { RoutePlanner } from "./plan-route";
import type { SpeechSynthesizer } from "./ports";
import type { StoryService } from "./tell-story";

const story = (placeId: string, text = `O miejscu ${placeId}.`): Story => ({
  placeId,
  text,
  sources: [],
  cached: false,
  factIds: ["f1"],
  contextIds: [],
  recap: false,
});

function memoryStore(): FixtureStore {
  const stories = new Map<string, Story>();
  const clips = new Map<string, Uint8Array<ArrayBuffer>>();
  return {
    story: (id) => stories.get(id),
    saveStory: (s) => {
      if (!stories.has(s.placeId)) stories.set(s.placeId, s);
    },
    audio: (text) => clips.get(text),
    saveAudio: (text, audio) => clips.set(text, new Uint8Array(audio)),
    size: () => ({ stories: stories.size, clips: clips.size }),
  };
}

function fakeStories(): StoryService & { tell: ReturnType<typeof vi.fn> } {
  const tell = vi.fn(async (r: { placeId: string }) => story(r.placeId, `Fakty ${r.placeId}.`));
  return { tell, tellStream: vi.fn(), warm: vi.fn() };
}

const request = (placeId: string) => ({ placeId, targetSec: 60, interests: ["historical"] });

async function readAll(text: AsyncIterable<string>) {
  let all = "";
  for await (const piece of text) all += piece;
  return all;
}

describe("createReplayStoryService", () => {
  it("tells the saved story to every listener, in one piece", async () => {
    const store = memoryStore();
    store.saveStory(story("p1", "Zapisana opowieść."));
    const fallback = fakeStories();
    const service = createReplayStoryService(store, fallback);

    const told = await service.tellStream({ ...request("p1"), heardFacts: ["f1"] } as never);
    expect(await readAll(told.text)).toBe("Zapisana opowieść.");
    expect(told.whole).toBe("Zapisana opowieść.");
    expect(fallback.tell).not.toHaveBeenCalled();
  });

  it("falls back to the facts story for a place never recorded", async () => {
    const fallback = fakeStories();
    const service = createReplayStoryService(memoryStore(), fallback);
    await expect(service.tell(request("p2") as never)).resolves.toMatchObject({
      text: "Fakty p2.",
    });
  });
});

describe("createRecordingStoryService", () => {
  it("saves the first story of a place and serves it from then on", async () => {
    const store = memoryStore();
    const real = fakeStories();
    const service = createRecordingStoryService(real, store, new Set());
    await service.tell(request("p1") as never);
    await service.tell(request("p1") as never);
    expect(real.tell).toHaveBeenCalledTimes(1);
    expect(store.story("p1")?.text).toBe("Fakty p1.");
  });

  it("does not save a story the LLM failed on", async () => {
    const store = memoryStore();
    const failed = new Set<string>();
    const real = fakeStories();
    real.tell.mockImplementationOnce(async (r: { placeId: string }) => {
      failed.add(r.placeId);
      return story(r.placeId);
    });
    await createRecordingStoryService(real, store, failed).tell(request("p1") as never);
    expect(store.story("p1")).toBeUndefined();
  });
});

describe("createFixtureSynthesizer", () => {
  const bytes = new Uint8Array([1, 2, 3]);

  it("replays a saved clip and fails without one", async () => {
    const store = memoryStore();
    store.saveAudio("Raz.", bytes);
    const synth = createFixtureSynthesizer(store);
    await expect(synth.synthesize("Raz.")).resolves.toMatchObject({ contentType: "audio/mpeg" });
    await expect(synth.synthesize("Dwa.")).rejects.toMatchObject({ code: "UPSTREAM_ERROR" });
    expect(synth.stream).toBeUndefined();
  });

  it("records a missing clip with the real synthesizer", async () => {
    const store = memoryStore();
    const real: SpeechSynthesizer = {
      synthesize: vi.fn(async () => ({ audio: new Uint8Array(bytes), contentType: "audio/mpeg" })),
    };
    await createFixtureSynthesizer(store, real).synthesize("Trzy.");
    expect(store.audio("Trzy.")).toEqual(bytes);
  });
});

describe("createFixedDestinationSearch", () => {
  const search = createFixedDestinationSearch();

  it("finds by the start of words, without Polish letters", async () => {
    const names = (await search.search("lazienki")).map((d) => d.name);
    expect(names).toEqual(["Łazienki Królewskie"]);
    expect((await search.search("muzeum pow")).map((d) => d.name)).toEqual([
      "Muzeum Powstania Warszawskiego",
    ]);
  });

  it("answers nothing for an empty query", async () => {
    expect(await search.search("  ")).toEqual([]);
  });
});

describe("createCachedRoutePlanner", () => {
  const plan = {
    origin: { lat: 52.23701, lng: 20.98021 },
    durationMin: 30,
    interests: ["historical"],
  };

  it("plans once for the same ride asked from the same room", async () => {
    const real: RoutePlanner = { plan: vi.fn(async () => ({}) as Route) };
    let t = 0;
    const planner = createCachedRoutePlanner(real, () => t);
    const now = new Date();
    await Promise.all([
      planner.plan(plan as never, now),
      planner.plan({ ...plan, origin: { lat: 52.23704, lng: 20.98018 } } as never, now),
    ]);
    expect(real.plan).toHaveBeenCalledTimes(1);
    t = 61_000;
    await planner.plan(plan as never, now);
    expect(real.plan).toHaveBeenCalledTimes(2);
  });

  it("asks again after a failed plan", async () => {
    const real: RoutePlanner = {
      plan: vi
        .fn()
        .mockRejectedValueOnce(new Error("boom"))
        .mockResolvedValue({} as Route),
    };
    const planner = createCachedRoutePlanner(real, () => 0);
    await expect(planner.plan(plan as never, new Date())).rejects.toThrow("boom");
    await expect(planner.plan(plan as never, new Date())).resolves.toEqual({});
  });
});
