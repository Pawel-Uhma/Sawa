import { Hono } from "hono";
import { cors } from "hono/cors";
import { createFakePlacesRepository } from "./adapters/supabase/fake-places-repository";
import { AppError, toErrorBody } from "./lib/errors";
import { createDebugRoutes } from "./routes/debug";
import { createDestinationRoutes } from "./routes/destinations";
import { healthRoutes } from "./routes/health";
import { placeRoutes } from "./routes/places";
import { createRouteRoutes } from "./routes/routes";
import { createSpeechRoutes } from "./routes/speech";
import { createStoryRoutes } from "./routes/stories";
import type { RoutePlanner } from "./services/plan-route";
import type { LlmProvider, PlacesRepository } from "./services/ports";
import {
  createDisabledDestinationService,
  type DestinationService,
} from "./services/search-destinations";
import { createDisabledSpeechService, type SpeechService } from "./services/speak";
import { createStoryService } from "./services/tell-story";

export type AppServices = {
  routePlanner: RoutePlanner;
  /** Defaults to the in-memory fake (tests, offline demo). */
  places?: PlacesRepository;
  /** Missing → stories are the place's facts read plainly. */
  llm?: LlmProvider;
  /** Missing → POST /v1/speech and /v1/stories/audio answer UPSTREAM_ERROR. */
  speech?: SpeechService;
  /** Missing → GET /v1/destinations answers UPSTREAM_ERROR. */
  destinations?: DestinationService;
  onLlmError?: (err: unknown, placeId: string) => void;
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
  const { services } = config;
  const stories = createStoryService({
    places: services.places ?? createFakePlacesRepository(),
    llm: services.llm,
    onLlmError: services.onLlmError,
  });
  const speech = services.speech ?? createDisabledSpeechService();
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
    .route("/", createRouteRoutes(services.routePlanner))
    .route("/", placeRoutes(services.places ?? createFakePlacesRepository()))
    .route("/", createSpeechRoutes(speech))
    .route("/", createStoryRoutes(stories, speech))
    .route(
      "/",
      createDestinationRoutes(services.destinations ?? createDisabledDestinationService()),
    );

  if (config.debugPages) app.route("/", createDebugRoutes());
  return app;
}

/** Used by apps/web for the typed `hc` client. */
export type AppType = ReturnType<typeof createApp>;
