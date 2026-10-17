import { serve } from "@hono/node-server";
import { loadTransitData } from "./adapters/gtfs/load-transit";
import { createFilePlacesSource } from "./adapters/places/file-source";
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
  places: createFilePlacesSource(new URL("../data/places.geojson", import.meta.url)),
  departures: createWawDepartureSource(env.WAW_TOKEN),
  onSkippedPlaces: (count) => logger.warn({ count }, "invalid place features skipped"),
});

const app = createApp({
  corsOrigins: env.CORS_ORIGINS,
  corsPreviewPattern: env.CORS_PREVIEW_PATTERN,
  debugPages: env.DEBUG_PAGES,
  services: { routePlanner },
  onUnexpectedError: (err) => logger.error({ err }, "unhandled error"),
});

serve({ fetch: app.fetch, port: env.PORT }, ({ port }) => {
  logger.info({ port, departures: Boolean(env.WAW_TOKEN) }, "api listening");
});
