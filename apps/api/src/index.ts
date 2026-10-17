import { serve } from "@hono/node-server";
import {
  createSupabaseClient,
  createSupabasePlacesRepository,
} from "./adapters/supabase/places-repository";
import { createApp } from "./app";
import { loadEnv } from "./lib/env";
import { createLogger } from "./lib/logger";

const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL);

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
  onUnexpectedError: (err) => logger.error({ err }, "unhandled error"),
  placesRepository,
});

serve({ fetch: app.fetch, port: env.PORT }, ({ port }) => {
  logger.info({ port }, "api listening");
});
