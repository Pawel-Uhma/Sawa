import { serve } from "@hono/node-server";

import { loadTransitData } from "./adapters/gtfs/load-transit";
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

const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL);

const transit = loadTransitData(new URL("../data/transit-graph.json.gz", import.meta.url));
logger.info(
  { serviceDate: transit.serviceDate, patterns: transit.network.patterns.size },
  "transit graph loaded",
);

const routePlanner = createRoutePlanner({
  transit,
  places: createFilePlacesRepository(new URL("../data/places.geojson", import.meta.url)),
  departures: createWawDepartureSource(env.WAW_TOKEN),
});

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
  logger.warn("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set: serving fake places");

const app = createApp({
  corsOrigins: env.CORS_ORIGINS,
  corsPreviewPattern: env.CORS_PREVIEW_PATTERN,
  debugPages: env.DEBUG_PAGES,
  services: { routePlanner, places: placesRepository },
  onUnexpectedError: (err) => logger.error({ err }, "unhandled error"),
});

serve({ fetch: app.fetch, port: env.PORT }, ({ port }) => {
  logger.info({ port, departures: Boolean(env.WAW_TOKEN) }, "api listening");
});
