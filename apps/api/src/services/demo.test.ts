import { HACKATHON_VENUE, type Route, type Story } from "@sawa/shared";
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

  it("does not save a silent place, which replay would read out as its name", async () => {
    const store = memoryStore();
    const real = fakeStories();
    real.tell.mockResolvedValueOnce({ ...story("p1", "Kapliczka"), factIds: [], silent: true });
    await createRecordingStoryService(real, store, new Set()).tell(request("p1") as never);
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
    const names = (await search.search("lazienki")).results.map((d) => d.name);
    expect(names).toEqual(["Łazienki Królewskie"]);
    expect((await search.search("muzeum pow")).results.map((d) => d.name)).toEqual([
      "Muzeum Powstania Warszawskiego",
    ]);
  });

  it("answers nothing for an empty query", async () => {
    expect((await search.search("  ")).results).toEqual([]);
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
    const planner = createCachedRoutePlanner(real, { clock: () => t });
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

  it("plans again for another seed or other places to avoid, not for the same ones", async () => {
    const real: RoutePlanner = { plan: vi.fn(async () => ({}) as Route) };
    const planner = createCachedRoutePlanner(real, { clock: () => 0 });
    const now = new Date();
    await planner.plan({ ...plan, seed: 1 } as never, now);
    await planner.plan({ ...plan, seed: 1 } as never, now);
    await planner.plan({ ...plan, seed: 2 } as never, now);
    await planner.plan({ ...plan, seed: 2, excludePlaceIds: ["b", "a"] } as never, now);
    await planner.plan({ ...plan, seed: 2, excludePlaceIds: ["a", "b"] } as never, now);
    expect(real.plan).toHaveBeenCalledTimes(3);
  });

  it("asks again after a failed plan", async () => {
    const real: RoutePlanner = {
      plan: vi
        .fn()
        .mockRejectedValueOnce(new Error("boom"))
        .mockResolvedValue({} as Route),
    };
    const planner = createCachedRoutePlanner(real, { clock: () => 0 });
    await expect(planner.plan(plan as never, new Date())).rejects.toThrow("boom");
    await expect(planner.plan(plan as never, new Date())).resolves.toEqual({});
  });

  const atVenue = { ...plan, origin: { lat: 52.2363, lng: 20.9795 } }; // ~60 m from the door

  it("starts every phone in 42 Warsaw at its door, so the hall shares one plan", async () => {
    const real: RoutePlanner = { plan: vi.fn(async () => ({}) as Route) };
    const planner = createCachedRoutePlanner(real, { clock: () => 0 });
    await planner.plan(atVenue as never, new Date());
    await planner.plan({ ...plan, origin: { lat: 52.2355, lng: 20.9783 } } as never, new Date());
    expect(real.plan).toHaveBeenCalledTimes(1);
    expect(vi.mocked(real.plan).mock.calls[0]?.[0].origin).toEqual(HACKATHON_VENUE);
  });

  it("keeps rides from the venue planned in the background", async () => {
    let n = 0;
    const real: RoutePlanner = { plan: vi.fn(async () => ({ totalMin: ++n }) as Route) };
    let t = 0;
    const planner = createCachedRoutePlanner(real, { clock: () => t });
    await planner.plan(atVenue as never, new Date());

    t = 50_000;
    await planner.refresh();
    expect(real.plan).toHaveBeenCalledTimes(2);
    // Two minutes on, the refreshed plan answers at once.
    t = 120_000;
    await expect(planner.plan(atVenue as never, new Date())).resolves.toEqual({ totalMin: 2 });
    expect(real.plan).toHaveBeenCalledTimes(2);
  });

  it("plans the stage rides before anyone asks and keeps them", async () => {
    const real: RoutePlanner = { plan: vi.fn(async () => ({}) as Route) };
    let t = 0;
    const stage = { ...plan, origin: HACKATHON_VENUE, interests: ["historical"] };
    const planner = createCachedRoutePlanner(real, { clock: () => t, keepWarm: [stage as never] });
    expect(real.plan).toHaveBeenCalledTimes(1);
    t = 60 * 60_000;
    await planner.refresh();
    await planner.plan({ ...stage, audience: "kids" } as never, new Date());
    expect(real.plan).toHaveBeenCalledTimes(2);
  });
});
