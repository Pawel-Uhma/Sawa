import { serve } from "@hono/node-server";
import { createFixtureStore } from "./adapters/demo/fixture-store";
import { createElevenLabsSynthesizer } from "./adapters/elevenlabs/speech-synthesizer";
import { createGoogleDestinationSearch } from "./adapters/google-places/destination-search";
import { loadTransitCalendar } from "./adapters/gtfs/load-transit";
import { createOpenRouterProvider } from "./adapters/llm/openrouter";
import { createNextbikeStationSource } from "./adapters/nextbike/bike-stations";
import { createOsrmWalkPathSource, firstWalkPath } from "./adapters/osrm/walk-paths";
import { createPiperSynthesizer } from "./adapters/piper/speech-synthesizer";
import { createFilePlacesRepository } from "./adapters/places-file/file-places-repository";
import { createCachedPlacesRepository } from "./adapters/supabase/cached-places-repository";
import {
  createSupabaseClient,
  createSupabasePlacesRepository,
} from "./adapters/supabase/places-repository";
import { createValhallaWalkPathSource } from "./adapters/valhalla/walk-paths";
import { createWawDepartureSource } from "./adapters/waw/departures";
import { createWawVehiclePositionSource } from "./adapters/waw/vehicle-positions";
import { createApp } from "./app";
import { loadEnv } from "./lib/env";
import { createLogger } from "./lib/logger";
import { warsawDate } from "./routes/health";
import { DEMO_REQUEST } from "./routes/routes";
import {
  createCachedRoutePlanner,
  createFixedDestinationSearch,
  createFixtureSynthesizer,
  createRecordingStoryService,
  createReplayStoryService,
  DEMO_WARM_RIDES,
} from "./services/demo";
import { createTrackerBoardingSource } from "./services/live-boarding";
import { createRoutePlanner } from "./services/plan-route";
import { withWaypoints } from "./services/plan-waypoints";
import { createPlaceResearch } from "./services/research-place";
import { createDestinationService } from "./services/search-destinations";
import { createSpeechService } from "./services/speak";
import { createFallbackSynthesizer } from "./services/speech-fallback";
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

// One GTFS snapshot per day; the planner switches at midnight. Real times come from the
// timetable and positions.
const transit = loadTransitCalendar(new URL("../data/transit/", import.meta.url));
const today = transit.forDate(warsawDate(new Date()));
logger.info(
  { dates: transit.dates, serviceDate: today.serviceDate, patterns: today.network.patterns.size },
  "transit graphs found",
);
if (today.serviceDate !== warsawDate(new Date())) {
  logger.warn(
    { serviceDate: today.serviceDate },
    "no transit graph for today: rebuild them (pnpm --filter @sawa/scripts transit, T-18)",
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

// Walking paths: OSRM (on production our own osrm-routed in this container), then Valhalla when
// OSRM fails (public, blocks busy IPs).
const walkPathSources = [
  ...(env.WALK_ROUTER_URL
    ? [
        createOsrmWalkPathSource(env.WALK_ROUTER_URL, logger, {
          maxInFlight: env.WALK_ROUTER_MAX_IN_FLIGHT,
        }),
      ]
    : []),
  ...(env.WALK_ROUTER_FALLBACK_URL
    ? [createValhallaWalkPathSource(env.WALK_ROUTER_FALLBACK_URL, logger)]
    : []),
];

// Bike and car legs: OSRM with that profile, then Valhalla with its costing (#190, #191).
const wheelPathSource = (url: string | undefined, costing: "bicycle" | "auto") => {
  const sources = [
    ...(url ? [createOsrmWalkPathSource(url, logger)] : []),
    ...(env.WALK_ROUTER_FALLBACK_URL
      ? [createValhallaWalkPathSource(env.WALK_ROUTER_FALLBACK_URL, logger, { costing })]
      : []),
  ];
  return sources.length > 0 ? firstWalkPath(sources) : undefined;
};
const wheelPaths = {
  bike: wheelPathSource(env.BIKE_ROUTER_URL, "bicycle"),
  car: wheelPathSource(env.CAR_ROUTER_URL, "auto"),
};
// Veturilo stations, live bikes and docks (#192): bike routes start and end at a station.
const bikeStations = env.VETURILO_GBFS_URL
  ? createNextbikeStationSource({ baseUrl: env.VETURILO_GBFS_URL, logger })
  : undefined;

// The planner reads Supabase; the committed export is its fallback when Supabase fails.
const placesFile = createFilePlacesRepository(new URL("../data/places.geojson", import.meta.url));
const livePlanner = withWaypoints(
  createRoutePlanner({
    transit,
    places: placesRepository ?? placesFile,
    fallbackPlaces: placesRepository ? placesFile : undefined,
    departures: createWawDepartureSource(env.WAW_TOKEN, wawApi),
    live: env.WAW_TOKEN ? createTrackerBoardingSource(vehicles) : undefined,
    walkPaths: walkPathSources.length > 0 ? firstWalkPath(walkPathSources) : undefined,
    wheelPaths,
    bikeStations,
    logger,
  }),
);
// Demo: rides from 42 Warsaw stay planned in the background, so phones in the hall do not wait.
const cachedPlanner =
  demo === "off"
    ? undefined
    : createCachedRoutePlanner(livePlanner, { keepWarm: [...DEMO_WARM_RIDES, DEMO_REQUEST] });
if (cachedPlanner) setInterval(() => void cachedPlanner.refresh(), 15_000).unref();
const routePlanner = cachedPlanner ?? livePlanner;

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
  ? createElevenLabsSynthesizer({
      apiKey: env.ELEVENLABS_KEY,
      fallbackApiKey: env.ELEVENLABS_KEY_2,
    })
  : undefined;
// Local voices (Polish and English) for when ElevenLabs is out of reach (no key, no credits, timeout).
const localVoice =
  demo === "off" && env.LOCAL_TTS
    ? createPiperSynthesizer({ modelDir: env.PIPER_MODEL_DIR })
    : undefined;
localVoice
  ?.warm()
  .then(() => logger.info("local voice ready"))
  .catch((err) => logger.warn({ err }, "local voice failed to load, retried on first story"));
const voice =
  elevenLabs && localVoice
    ? createFallbackSynthesizer(elevenLabs, localVoice, {
        onFallback: (err) => logger.warn({ err }, "ElevenLabs failed, local voice reads"),
      })
    : (elevenLabs ?? localVoice);
const speech = fixtures
  ? createSpeechService(
      createFixtureSynthesizer(fixtures, demo === "record" ? elevenLabs : undefined),
    )
  : voice && createSpeechService(voice);

const destinations = fixtures
  ? createDestinationService(createFixedDestinationSearch())
  : env.GOOGLE_PLACES_API_KEY
    ? createDestinationService(
        createGoogleDestinationSearch(env.GOOGLE_PLACES_API_KEY, {
          // Shows whether the key has Autocomplete and Place Details enabled; the key is never logged.
          onAddressError: (err) => logger.warn({ err }, "destination address lookup failed"),
        }),
      )
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
  transitDate: (now) => transit.forDate(warsawDate(now)).serviceDate,
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
    bikeStations,
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
      walkPathsFallback: env.WALK_ROUTER_FALLBACK_URL ?? null,
      bikePaths: env.BIKE_ROUTER_URL ?? null,
      carPaths: env.CAR_ROUTER_URL ?? null,
      veturilo: Boolean(bikeStations),
      llm: llm?.model ?? null,
      research: Boolean(research),
      speech: Boolean(speech),
      localVoice: Boolean(localVoice),
      destinations: Boolean(destinations),
      demo,
    },
    "api listening",
  );
});
