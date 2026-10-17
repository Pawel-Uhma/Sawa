import { serve } from "@hono/node-server";
import { createElevenLabsSynthesizer } from "./adapters/elevenlabs/speech-synthesizer";
import { createGoogleDestinationSearch } from "./adapters/google-places/destination-search";
import { loadTransitData } from "./adapters/gtfs/load-transit";
import { createOpenRouterProvider } from "./adapters/llm/openrouter";
import { createOsrmWalkPathSource } from "./adapters/osrm/walk-paths";
import { createFilePlacesRepository } from "./adapters/places-file/file-places-repository";
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
import { createTrackerBoardingSource } from "./services/live-boarding";
import { createRoutePlanner } from "./services/plan-route";
import { createDestinationService } from "./services/search-destinations";
import { createSpeechService } from "./services/speak";
import { createVehicleTracker } from "./services/track-vehicles";

const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL);

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

const placesRepository =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    ? createSupabasePlacesRepository(
        createSupabaseClient({
          url: env.SUPABASE_URL,
          serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
        }),
      )
    : undefined;
if (!placesRepository)
  logger.warn(
    "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set: /v1/places serves fake places, the planner uses places.geojson",
  );

const vehicles = createVehicleTracker({
  source: env.WAW_TOKEN ? createWawVehiclePositionSource(env.WAW_TOKEN) : undefined,
  transit,
  logger,
  alwaysOn: env.VEHICLES_ALWAYS_ON,
});
vehicles.start();

// The planner reads Supabase; the committed export is its fallback when Supabase fails.
const placesFile = createFilePlacesRepository(new URL("../data/places.geojson", import.meta.url));
const routePlanner = createRoutePlanner({
  transit,
  places: placesRepository ?? placesFile,
  fallbackPlaces: placesRepository ? placesFile : undefined,
  departures: createWawDepartureSource(env.WAW_TOKEN),
  live: env.WAW_TOKEN ? createTrackerBoardingSource(vehicles) : undefined,
  walkPaths: env.WALK_ROUTER_URL ? createOsrmWalkPathSource(env.WALK_ROUTER_URL) : undefined,
  logger,
});

const llm = env.OPENROUTER_KEY
  ? createOpenRouterProvider({ apiKey: env.OPENROUTER_KEY, model: env.OPENROUTER_MODEL })
  : undefined;

const speech = env.ELEVENLABS_KEY
  ? createSpeechService(createElevenLabsSynthesizer({ apiKey: env.ELEVENLABS_KEY }))
  : undefined;

const destinations = env.GOOGLE_PLACES_API_KEY
  ? createDestinationService(createGoogleDestinationSearch(env.GOOGLE_PLACES_API_KEY))
  : undefined;

const app = createApp({
  corsOrigins: env.CORS_ORIGINS,
  corsPreviewPattern: env.CORS_PREVIEW_PATTERN,
  debugPages: env.DEBUG_PAGES,
  transitDate: transit.serviceDate,
  services: {
    routePlanner,
    places: placesRepository,
    llm,
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
      llm: llm?.model ?? null,
      speech: Boolean(speech),
      destinations: Boolean(destinations),
    },
    "api listening",
  );
});
