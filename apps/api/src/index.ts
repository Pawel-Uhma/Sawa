import { serve } from "@hono/node-server";
import { createFixtureStore } from "./adapters/demo/fixture-store";
import { createElevenLabsSynthesizer } from "./adapters/elevenlabs/speech-synthesizer";
import { createGoogleDestinationSearch } from "./adapters/google-places/destination-search";
import { loadTransitData } from "./adapters/gtfs/load-transit";
import { createOpenRouterProvider } from "./adapters/llm/openrouter";
import { createOsrmWalkPathSource } from "./adapters/osrm/walk-paths";
import { createFilePlacesRepository } from "./adapters/places-file/file-places-repository";
import { createCachedPlacesRepository } from "./adapters/supabase/cached-places-repository";
import {
  createSupabaseClient,
  createSupabasePlacesRepository,
} from "./adapters/supabase/places-repository";
import { createWawDepartureSource } from "./adapters/waw/departures";
import { createWawVehiclePositionSource } from "./adapters/waw/vehicle-positions";
import { createApp } from "./app";
import { loadEnv } from "./lib/env";
import { createLogger } from "./lib/logger";
import { warsawDate } from "./routes/health";
import {
  createCachedRoutePlanner,
  createFixedDestinationSearch,
  createFixtureSynthesizer,
  createRecordingStoryService,
  createReplayStoryService,
} from "./services/demo";
import { createTrackerBoardingSource } from "./services/live-boarding";
import { createRoutePlanner } from "./services/plan-route";
import { createPlaceResearch } from "./services/research-place";
import { createDestinationService } from "./services/search-destinations";
import { createSpeechService } from "./services/speak";
import type { StoryService } from "./services/tell-story";
import { createVehicleTracker } from "./services/track-vehicles";

/** About 30 requests a ride: room for a hall of phones behind one NAT. */
const DEMO_STORY_RATE_LIMIT = { limit: 20_000, windowMs: 10 * 60_000 };

const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL);
const demo = env.DEMO_MODE;
// Saved stories and voice for the pitch (services/demo.ts); committed with the code.
const fixtures =
  demo === "off" ? undefined : createFixtureStore(new URL("../data/demo/", import.meta.url));
if (fixtures) logger.info({ demo, ...fixtures.size() }, "demo mode: saved stories and voice");

const transit = loadTransitData(new URL("../data/transit-graph.json.gz", import.meta.url));
logger.info(
  { serviceDate: transit.serviceDate, patterns: transit.network.patterns.size },
  "transit graph loaded",
);
// The graph is a GTFS snapshot of one day; real times come from the timetable and positions.
if (transit.serviceDate !== warsawDate(new Date())) {
  logger.warn(
    { serviceDate: transit.serviceDate },
    "transit graph is for another day: rebuild it (pnpm --filter @sawa/scripts transit, T-18)",
  );
}

// Cached: during the demo many phones ask for the same area and the same places at once.
const placesRepository =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    ? createCachedPlacesRepository(
        createSupabasePlacesRepository(
          createSupabaseClient({
            url: env.SUPABASE_URL,
            serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
          }),
        ),
      )
    : undefined;
if (!placesRepository)
  logger.warn(
    "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set: /v1/places serves fake places, the planner uses places.geojson",
  );

const wawApi = { baseUrl: env.WAW_API_BASE_URL, proxyKey: env.WAW_PROXY_KEY };
const vehicles = createVehicleTracker({
  source: env.WAW_TOKEN ? createWawVehiclePositionSource(env.WAW_TOKEN, wawApi) : undefined,
  transit,
  logger,
  alwaysOn: env.VEHICLES_ALWAYS_ON,
});
vehicles.start();

// The planner reads Supabase; the committed export is its fallback when Supabase fails.
const placesFile = createFilePlacesRepository(new URL("../data/places.geojson", import.meta.url));
const livePlanner = createRoutePlanner({
  transit,
  places: placesRepository ?? placesFile,
  fallbackPlaces: placesRepository ? placesFile : undefined,
  departures: createWawDepartureSource(env.WAW_TOKEN, wawApi),
  live: env.WAW_TOKEN ? createTrackerBoardingSource(vehicles) : undefined,
  walkPaths: env.WALK_ROUTER_URL ? createOsrmWalkPathSource(env.WALK_ROUTER_URL) : undefined,
  logger,
});
const routePlanner = demo === "off" ? livePlanner : createCachedRoutePlanner(livePlanner);

// Replay never calls the LLM: a place without a saved story gets its facts read plainly.
const llm =
  demo !== "replay" && env.OPENROUTER_KEY
    ? createOpenRouterProvider({ apiKey: env.OPENROUTER_KEY, model: env.OPENROUTER_MODEL })
    : undefined;

// One web search per place for stories beyond the seed (T-41); STORY_RESEARCH=0 turns it off.
const research =
  llm && env.STORY_RESEARCH
    ? createPlaceResearch({
        llm,
        onError: (err, placeId) => logger.warn({ err, placeId }, "research failed, seed only"),
      })
    : undefined;

const elevenLabs = env.ELEVENLABS_KEY
  ? createElevenLabsSynthesizer({ apiKey: env.ELEVENLABS_KEY })
  : undefined;
const speech = fixtures
  ? createSpeechService(
      createFixtureSynthesizer(fixtures, demo === "record" ? elevenLabs : undefined),
    )
  : elevenLabs && createSpeechService(elevenLabs);

const destinations = fixtures
  ? createDestinationService(createFixedDestinationSearch())
  : env.GOOGLE_PLACES_API_KEY
    ? createDestinationService(createGoogleDestinationSearch(env.GOOGLE_PLACES_API_KEY))
    : undefined;

const llmFailed = new Set<string>();
const demoStories =
  fixtures &&
  (demo === "record"
    ? (built: StoryService) => createRecordingStoryService(built, fixtures, llmFailed)
    : (built: StoryService) => createReplayStoryService(fixtures, built));

const app = createApp({
  corsOrigins: env.CORS_ORIGINS,
  corsPreviewPattern: env.CORS_PREVIEW_PATTERN,
  debugPages: env.DEBUG_PAGES,
  transitDate: transit.serviceDate,
  demoMode: demo,
  // Nothing in replay costs credits, and the whole room comes from the venue's one IP.
  storyRateLimit: demo === "replay" ? DEMO_STORY_RATE_LIMIT : undefined,
  services: {
    routePlanner,
    places: placesRepository,
    llm,
    research,
    speech,
    destinations,
    vehicles,
    stories: demoStories,
    onLlmError: (err, placeId) => {
      llmFailed.add(placeId);
      logger.warn({ err, placeId }, "llm failed, story from facts");
    },
  },
  onUnexpectedError: (err) => logger.error({ err }, "unhandled error"),
});

serve({ fetch: app.fetch, port: env.PORT }, ({ port }) => {
  logger.info(
    {
      port,
      departures: Boolean(env.WAW_TOKEN),
      walkPaths: env.WALK_ROUTER_URL ?? null,
      llm: llm?.model ?? null,
      research: Boolean(research),
      speech: Boolean(speech),
      destinations: Boolean(destinations),
      demo,
    },
    "api listening",
  );
});
