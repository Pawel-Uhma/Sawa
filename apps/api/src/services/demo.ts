import type { Destination, PlanRouteRequest, Route, Story } from "@sawa/shared";
import type { SpeechAudio } from "../domain/speech";
import { AppError } from "../lib/errors";
import type { RoutePlanner } from "./plan-route";
import type { DestinationSearch, SpeechSynthesizer } from "./ports";
import type { StoryService, StoryStream } from "./tell-story";

/**
 * Pitch mode (DEMO_MODE): a room of phones on one Wi-Fi must not drain the LLM, ElevenLabs and
 * Google Places, nor wait on them. `record` uses the real providers and saves what they made;
 * `replay` serves only what was saved. Places and ZTM stay live.
 */
export type DemoMode = "off" | "record" | "replay";

/** Saved stories and their voice (adapters/demo/fixture-store.ts). */
export type FixtureStore = {
  story(placeId: string): Story | undefined;
  saveStory(story: Story): void;
  audio(text: string): Uint8Array<ArrayBuffer> | undefined;
  saveAudio(text: string, audio: Uint8Array): void;
  size(): { stories: number; clips: number };
};

async function* once(text: string) {
  yield text;
}

const known = (story: Story): StoryStream => ({
  text: once(story.text),
  whole: story.text,
  story: Promise.resolve(story),
});

/**
 * Saved story of the place, whoever listens: the listener's profile and memory are ignored, so
 * every phone hears the rehearsed one. A place never recorded gets `fallback` (the facts story).
 */
export function createReplayStoryService(
  fixtures: Pick<FixtureStore, "story">,
  fallback: StoryService,
): StoryService {
  const tell = async (request: Parameters<StoryService["tell"]>[0]) =>
    fixtures.story(request.placeId) ?? fallback.tell(request);
  return {
    tell,
    tellStream: async (request) => known(await tell(request)),
    warm: () => {},
  };
}

/**
 * The real stories, each saved the first time it is told. Whole stories, not streamed: the saved
 * text is then exactly what the voice reads, so the clip is found by its text on replay.
 */
export function createRecordingStoryService(
  real: StoryService,
  fixtures: Pick<FixtureStore, "story" | "saveStory">,
  /** Places whose last story fell back to the facts (filled by the story service's onLlmError). */
  llmFailed: Set<string>,
): StoryService {
  const tell = async (request: Parameters<StoryService["tell"]>[0]) => {
    const saved = fixtures.story(request.placeId);
    if (saved) return saved;
    llmFailed.delete(request.placeId);
    const story = await real.tell(request);
    // The facts story is not worth keeping: the next take asks the LLM again.
    if (!llmFailed.has(request.placeId)) fixtures.saveStory(story);
    return story;
  };
  return { tell, tellStream: async (request) => known(await tell(request)), warm: real.warm };
}

/** Voice from saved clips; with `real` (record) a missing clip is made and saved. No `stream`. */
export function createFixtureSynthesizer(
  fixtures: Pick<FixtureStore, "audio" | "saveAudio">,
  real?: SpeechSynthesizer,
): SpeechSynthesizer {
  return {
    async synthesize(text): Promise<SpeechAudio> {
      const saved = fixtures.audio(text);
      if (saved) return { audio: saved, contentType: "audio/mpeg" };
      if (!real) throw new AppError("UPSTREAM_ERROR", "No recorded voice for this story (demo)");
      const made = await real.synthesize(text);
      fixtures.saveAudio(text, made.audio);
      return made;
    },
  };
}

type FixedDestination = Destination & { aliases: string[] };

/** Name, address, lat, lng, other words it is found by. */
type FixedRow = [string, string, number, number, ...string[]];

/** Where people ask to go from 42 Warsaw; positions to the entrance, good enough for a stop. */
const DEMO_DESTINATION_ROWS: FixedRow[] = [
  ["Plac Zamkowy", "Stare Miasto", 52.2477, 21.0137, "zamek"],
  ["Rynek Starego Miasta", "Stare Miasto", 52.2497, 21.0122, "starówka"],
  ["Pałac Kultury i Nauki", "pl. Defilad 1, Śródmieście", 52.2318, 21.006, "pkin"],
  ["Łazienki Królewskie", "ul. Agrykoli 1, Śródmieście", 52.215, 21.0352],
  ["Muzeum Powstania Warszawskiego", "ul. Grzybowska 79, Wola", 52.2323, 20.981, "mpw"],
  ["Centrum Nauki Kopernik", "Wybrzeże Kościuszkowskie 20, Powiśle", 52.2419, 21.0287],
  ["Stadion Narodowy", "al. Poniatowskiego 1, Praga-Południe", 52.2395, 21.0458],
  ["Muzeum POLIN", "ul. Anielewicza 6, Muranów", 52.2493, 20.993, "żydów"],
  ["Pałac w Wilanowie", "ul. Potockiego 10/16, Wilanów", 52.1652, 21.0904],
  ["Dworzec Centralny", "al. Jerozolimskie 54, Śródmieście", 52.2289, 21.0034],
  ["Plac Zbawiciela", "Śródmieście Południowe", 52.2198, 21.0177],
  ["Ogród Saski", "Śródmieście", 52.241, 21.0083],
  ["Uniwersytet Warszawski", "Krakowskie Przedmieście 26/28", 52.2403, 21.0189],
  ["Hala Mirowska", "pl. Mirowski 1, Wola", 52.2366, 20.996],
  ["Plac Wilsona", "Żoliborz", 52.2687, 20.9846],
  ["Cytadela Warszawska", "ul. Skazańców 25, Żoliborz", 52.2635, 21.0005],
  ["Bulwary Wiślane", "Bulwar Flotylli Wiślanej, Powiśle", 52.2435, 21.023, "wisła"],
  ["Plac Bankowy", "Śródmieście", 52.244, 21.0019],
  ["Muzeum Narodowe", "al. Jerozolimskie 3, Śródmieście", 52.2316, 21.0247],
  ["Zachęta", "pl. Małachowskiego 3, Śródmieście", 52.239, 21.0112],
  ["Centrum Praskie Koneser", "pl. Konesera, Praga-Północ", 52.2547, 21.0445],
  ["Kercelak", "pl. Kercelego, Wola", 52.23702, 20.98019],
  ["Park Szczęśliwicki", "Ochota", 52.2071, 20.9614],
];

export const DEMO_DESTINATIONS: FixedDestination[] = DEMO_DESTINATION_ROWS.map(
  ([name, address, lat, lng, ...aliases], i) => ({
    id: `demo-${i}`,
    name,
    address,
    position: { lat, lng },
    kind: "place",
    aliases,
  }),
);

const fold = (s: string) =>
  s.toLocaleLowerCase("pl").normalize("NFD").replace(/\p{M}/gu, "").replace(/ł/g, "l");

/** Google Places replaced by a fixed list: each typed word must start a word of the name. */
export function createFixedDestinationSearch(
  list: readonly FixedDestination[] = DEMO_DESTINATIONS,
): DestinationSearch {
  const indexed = list.map((d) => ({
    destination: { id: d.id, name: d.name, address: d.address, position: d.position, kind: d.kind },
    words: fold([d.name, d.address, ...d.aliases].join(" ")).split(/[^\p{L}\p{N}]+/u),
  }));
  return {
    async search(query) {
      const typed = fold(query)
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean);
      if (!typed.length) return [];
      return indexed
        .filter(({ words }) => typed.every((t) => words.some((w) => w.startsWith(t))))
        .slice(0, 5)
        .map((d) => d.destination);
    },
  };
}

/** ~100 m: phones in one room ask for the same ride. */
const ORIGIN_DECIMALS = 3;
const PLAN_TTL_MS = 60_000;
const MAX_CACHED_PLANS = 200;

/**
 * Same ride asked again within a minute → the same plan. A room of phones starting together
 * would otherwise run the beam search once each, one after another on one Node thread.
 */
export function createCachedRoutePlanner(
  planner: RoutePlanner,
  clock: () => number = Date.now,
): RoutePlanner {
  const cache = new Map<string, { at: number; route: Promise<Route> }>();
  const round = (v: number) => Number(v.toFixed(ORIGIN_DECIMALS));

  return {
    plan(request: PlanRouteRequest, now) {
      const { origin, destination } = request;
      const key = JSON.stringify({
        ...request,
        origin: { lat: round(origin.lat), lng: round(origin.lng) },
        destination: destination && { lat: round(destination.lat), lng: round(destination.lng) },
      });
      const t = clock();
      const hit = cache.get(key);
      if (hit && t - hit.at < PLAN_TTL_MS) return hit.route;
      const route = planner.plan(request, now);
      cache.set(key, { at: t, route });
      route.catch(() => cache.delete(key));
      if (cache.size > MAX_CACHED_PLANS) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      return route;
    },
  };
}
