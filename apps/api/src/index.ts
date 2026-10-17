import { serve } from "@hono/node-server";
import { createElevenLabsSynthesizer } from "./adapters/elevenlabs/speech-synthesizer";
import { loadTransitData } from "./adapters/gtfs/load-transit";
import { createOpenRouterProvider } from "./adapters/llm/openrouter";
import { createFilePlacesRepository } from "./adapters/places-file/file-places-repository";
import {
  createSupabaseClient,
  createSupabasePlacesRepository,
} from "./adapters/supabase/places-repository";
import { createWawDepartureSource } from "./adapters/waw/departures";
import { createApp } from "./app";
import { loadEnv } from "./lib/env";
import { createLogger } from "./lib/logger";
import { createRoutePlanner } from "./services/plan-route";
import { createSpeechService } from "./services/speak";

const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL);

const transit = loadTransitData(new URL("../data/transit-graph.json.gz", import.meta.url));
logger.info(
  { serviceDate: transit.serviceDate, patterns: transit.network.patterns.size },
  "transit graph loaded",
);

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

// The planner reads Supabase; the committed export is its fallback when Supabase fails.
const placesFile = createFilePlacesRepository(new URL("../data/places.geojson", import.meta.url));
const routePlanner = createRoutePlanner({
  transit,
  places: placesRepository ?? placesFile,
  fallbackPlaces: placesRepository ? placesFile : undefined,
  departures: createWawDepartureSource(env.WAW_TOKEN),
  logger,
});

const llm = env.OPENROUTER_KEY
  ? createOpenRouterProvider({ apiKey: env.OPENROUTER_KEY, model: env.OPENROUTER_MODEL })
  : undefined;

const speech = env.ELEVENLABS_KEY
  ? createSpeechService(createElevenLabsSynthesizer({ apiKey: env.ELEVENLABS_KEY }))
  : undefined;

const app = createApp({
  corsOrigins: env.CORS_ORIGINS,
  corsPreviewPattern: env.CORS_PREVIEW_PATTERN,
  debugPages: env.DEBUG_PAGES,
  services: {
    routePlanner,
    places: placesRepository,
    llm,
    speech,
    onLlmError: (err, placeId) => logger.warn({ err, placeId }, "llm failed, story from facts"),
  },
  onUnexpectedError: (err) => logger.error({ err }, "unhandled error"),
});

serve({ fetch: app.fetch, port: env.PORT }, ({ port }) => {
  logger.info(
    { port, departures: Boolean(env.WAW_TOKEN), llm: llm?.model ?? null, speech: Boolean(speech) },
    "api listening",
  );
});
