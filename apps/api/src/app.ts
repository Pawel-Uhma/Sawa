import { Hono } from "hono";
import { cors } from "hono/cors";
import { createFakePlacesRepository } from "./adapters/supabase/fake-places-repository";
import { AppError, toErrorBody } from "./lib/errors";
import { createDebugRoutes } from "./routes/debug";
import { healthRoutes } from "./routes/health";

import { placeRoutes } from "./routes/places";
import { createRouteRoutes } from "./routes/routes";
import type { RoutePlanner } from "./services/plan-route";
import type { PlacesRepository } from "./services/ports";

export type AppServices = {
  routePlanner: RoutePlanner;
  /** Defaults to the in-memory fake (tests, offline demo). */
  places?: PlacesRepository;
};

export type AppConfig = {
  corsOrigins: string[];
  corsPreviewPattern?: string;
  /** Mounts /debug/* pages (route planner preview). */
  debugPages?: boolean;
  services: AppServices;
  onUnexpectedError?: (err: unknown) => void;
};

/** Mounts routes on services built by the caller (index.ts wires the real adapters). */
export function createApp(config: AppConfig) {
  const previewPattern = config.corsPreviewPattern ? new RegExp(config.corsPreviewPattern) : null;

  const app = new Hono()
    .use(
      "*",
      cors({
        origin: (origin) =>
          config.corsOrigins.includes(origin) || previewPattern?.test(origin) ? origin : null,
      }),
    )
    .onError((err, c) => {
      if (err instanceof AppError) {
        return c.json(toErrorBody(err.code, err.message), err.status);
      }
      config.onUnexpectedError?.(err);
      return c.json(toErrorBody("INTERNAL", "Unexpected error"), 500);
    })
    .notFound((c) => c.json(toErrorBody("NOT_FOUND", "Route not found"), 404))
    .route("/", healthRoutes)
    .route("/", createRouteRoutes(config.services.routePlanner))
    .route("/", placeRoutes(config.services.places ?? createFakePlacesRepository()));

  if (config.debugPages) app.route("/", createDebugRoutes());
  return app;
}

/** Used by apps/web for the typed `hc` client. */
export type AppType = ReturnType<typeof createApp>;
