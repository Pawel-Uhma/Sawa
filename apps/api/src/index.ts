import { serve } from "@hono/node-server";
import { createElevenLabsSynthesizer } from "./adapters/elevenlabs/speech-synthesizer";
import { createGoogleDestinationSearch } from "./adapters/google-places/destination-search";
import { loadTransitCalendar } from "./adapters/gtfs/load-transit";
import { createOpenRouterProvider } from "./adapters/llm/openrouter";
import { createOsrmWalkPathSource, firstWalkPath } from "./adapters/osrm/walk-paths";
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
import { createTrackerBoardingSource } from "./services/live-boarding";
import { createRoutePlanner } from "./services/plan-route";
import { createPlaceResearch } from "./services/research-place";
import { createDestinationService } from "./services/search-destinations";
import { createSpeechService } from "./services/speak";
import { createVehicleTracker } from "./services/track-vehicles";

const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL);

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

// The planner reads Supabase; the committed export is its fallback when Supabase fails.
const placesFile = createFilePlacesRepository(new URL("../data/places.geojson", import.meta.url));
const routePlanner = createRoutePlanner({
  transit,
  places: placesRepository ?? placesFile,
  fallbackPlaces: placesRepository ? placesFile : undefined,
  departures: createWawDepartureSource(env.WAW_TOKEN, wawApi),
  live: env.WAW_TOKEN ? createTrackerBoardingSource(vehicles) : undefined,
  walkPaths: walkPathSources.length > 0 ? firstWalkPath(walkPathSources) : undefined,
  logger,
});

const llm = env.OPENROUTER_KEY
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

const speech = env.ELEVENLABS_KEY
  ? createSpeechService(createElevenLabsSynthesizer({ apiKey: env.ELEVENLABS_KEY }))
  : undefined;

const destinations = env.GOOGLE_PLACES_API_KEY
  ? createDestinationService(
      createGoogleDestinationSearch(env.GOOGLE_PLACES_API_KEY, {
        // Shows whether the key has Autocomplete and Place Details enabled; the key is never logged.
        onAddressError: (err) => logger.warn({ err }, "destination address lookup failed"),
      }),
    )
  : undefined;

const app = createApp({
  corsOrigins: env.CORS_ORIGINS,
  corsPreviewPattern: env.CORS_PREVIEW_PATTERN,
  debugPages: env.DEBUG_PAGES,
  transitDate: (now) => transit.forDate(warsawDate(now)).serviceDate,
  services: {
    routePlanner,
    places: placesRepository,
    llm,
    research,
    speech,
    destinations,
    vehicles,
    onLlmError: (err, placeId) => logger.warn({ err, placeId }, "llm failed, story from facts"),
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
      llm: llm?.model ?? null,
      research: Boolean(research),
      speech: Boolean(speech),
      destinations: Boolean(destinations),
    },
    "api listening",
  );
});
