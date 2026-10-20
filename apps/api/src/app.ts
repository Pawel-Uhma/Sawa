import { Hono } from "hono";
import { cors } from "hono/cors";
import { createFakePlacesRepository } from "./adapters/supabase/fake-places-repository";
import { AppError, toErrorBody } from "./lib/errors";
import type { RateLimitOpts } from "./lib/rate-limit";
import { createBikeStationRoutes } from "./routes/bike-stations";
import { createDebugRoutes } from "./routes/debug";
import { createDestinationRoutes } from "./routes/destinations";
import { createHealthRoutes } from "./routes/health";
import { placeRoutes } from "./routes/places";
import { createRouteRoutes } from "./routes/routes";
import { createSpeechRoutes } from "./routes/speech";
import { createStoryRoutes } from "./routes/stories";
import { createVehicleRoutes } from "./routes/vehicles";
import type { DemoMode } from "./services/demo";
import { createLiveStoryService } from "./services/live-story";
import type { RoutePlanner } from "./services/plan-route";
import type { BikeStationSource, LlmProvider, PlacesRepository } from "./services/ports";
import type { PlaceResearch } from "./services/research-place";
import {
  createDisabledDestinationService,
  type DestinationService,
} from "./services/search-destinations";
import { createDisabledSpeechService, type SpeechService } from "./services/speak";
import { createStoryService, type StoryService } from "./services/tell-story";
import { createDisabledVehicleTracker, type VehicleTracker } from "./services/track-vehicles";

export type AppServices = {
  routePlanner: RoutePlanner;
  /** Defaults to the in-memory fake (tests, offline demo). */
  places?: PlacesRepository;
  /** Missing → stories are the place's facts read plainly. */
  llm?: LlmProvider;
  /** Missing → stories use the seed's facts only, without stories from the web. */
  research?: PlaceResearch;
  /** Missing → POST /v1/stories/audio (and debug /v1/speech) answer UPSTREAM_ERROR. */
  speech?: SpeechService;
  /** Missing → GET /v1/destinations answers UPSTREAM_ERROR. */
  destinations?: DestinationService;
  onLlmError?: (err: unknown, placeId: string) => void;
  /** Missing → POST /v1/vehicles/track answers `live: false` with no vehicles. */
  vehicles?: VehicleTracker;
  /** Missing → GET /v1/bike-stations answers UPSTREAM_ERROR. */
  bikeStations?: BikeStationSource;
  /** Replaces the story service built from `places`, `llm` and `research` (demo replay). */
  stories?: (built: StoryService) => StoryService;
};

export type AppConfig = {
  corsOrigins: string[];
  corsPreviewPattern?: string;
  /** Mounts /debug/* pages (route planner preview) and POST /v1/speech for any text. */
  debugPages?: boolean;
  /** Service day of the transit graph in use at `now`, reported by /health. */
  transitDate?: string | ((now: Date) => string);
  /** Reported by /health, so a glance tells whether the pitch API serves saved stories. */
  demoMode?: DemoMode;
  /** Requests per IP for /v1/stories*; defaults to STORY_RATE_LIMIT. */
  storyRateLimit?: RateLimitOpts;
  services: AppServices;
  onUnexpectedError?: (err: unknown) => void;
};

/** Mounts routes on services built by the caller (index.ts wires the real adapters). */
export function createApp(config: AppConfig) {
  const { services } = config;
  const built = createStoryService({
    places: services.places ?? createFakePlacesRepository(),
    llm: services.llm,
    research: services.research,
    onLlmError: services.onLlmError,
  });
  const stories = services.stories ? services.stories(built) : built;
  const speech = services.speech ?? createDisabledSpeechService();
  const live = createLiveStoryService({ stories, speech, onError: services.onLlmError });
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
    .route("/", createHealthRoutes(config.transitDate, config.demoMode))
    .route("/", createRouteRoutes(services.routePlanner))
    .route("/", placeRoutes(services.places ?? createFakePlacesRepository()))
    .route("/", createStoryRoutes(stories, speech, live, config.storyRateLimit))
    .route(
      "/",
      createDestinationRoutes(services.destinations ?? createDisabledDestinationService()),
    )
    .route("/", createVehicleRoutes(services.vehicles ?? createDisabledVehicleTracker()))
    .route("/", createBikeStationRoutes(services.bikeStations));

  // Speaking any text spends ElevenLabs credits for anyone (T-92); the player uses /v1/stories/audio.
  if (config.debugPages) app.route("/", createDebugRoutes()).route("/", createSpeechRoutes(speech));
  return app;
}

/** Used by apps/web for the typed `hc` client. */
export type AppType = ReturnType<typeof createApp>;
