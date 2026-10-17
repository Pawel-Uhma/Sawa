import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8787),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((s) =>
      s
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    ),
  CORS_PREVIEW_PATTERN: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  /** dane.um.warszawa.pl token; without it departures fall back to the GTFS headway. */
  WAW_TOKEN: z
    .string()
    .optional()
    .transform((v) => v || undefined),
  /** dane.um.warszawa.pl or a proxy in front of it (Railway's IPs are blocked by the city, #63). */
  WAW_API_BASE_URL: z
    .string()
    .optional()
    .transform((v) => v || "https://dane.um.warszawa.pl"),
  /** Sent as X-Proxy-Key when WAW_API_BASE_URL is the proxy. */
  WAW_PROXY_KEY: z
    .string()
    .optional()
    .transform((v) => v || undefined),
  // Empty values (copied from .env.example) mean "not set": the API then serves fake places.
  SUPABASE_URL: z
    .string()
    .optional()
    .transform((s) => s || undefined),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .optional()
    .transform((s) => s || undefined),
  /** OpenRouter key for Sawa's stories; without it a story is the place's facts read plainly. */
  OPENROUTER_KEY: z
    .string()
    .optional()
    .transform((v) => v || undefined),
  /** OpenRouter model id; defaults to DEFAULT_OPENROUTER_MODEL (Gemini Flash Lite). */
  OPENROUTER_MODEL: z
    .string()
    .optional()
    .transform((v) => v || undefined),
  /** "0" turns off the web search for stories (one OpenRouter web call per place). */
  STORY_RESEARCH: z
    .enum(["0", "1"])
    .default("1")
    .transform((v) => v === "1"),
  /** ElevenLabs API key (Text to Speech permission); without it POST /v1/speech answers 502. */
  ELEVENLABS_KEY: z
    .string()
    .optional()
    .transform((v) => v || undefined),
  /** Google Places API (New) key for finding a ride destination by name; without it GET /v1/destinations answers 502. */
  GOOGLE_PLACES_API_KEY: z
    .string()
    .optional()
    .transform((v) => v || undefined),
  /**
   * OSRM server with the foot profile for walking paths (default: FOSSGIS, OpenStreetMap data,
   * no key); empty = straight walking lines.
   */
  WALK_ROUTER_URL: z
    .string()
    .default("https://routing.openstreetmap.de/routed-foot")
    .transform((v) => v || undefined),
  /**
   * Valhalla server asked for a walking path when the OSRM one fails (default: FOSSGIS, no
   * key); empty = no fallback.
   */
  WALK_ROUTER_FALLBACK_URL: z
    .string()
    .default("https://valhalla1.openstreetmap.de")
    .transform((v) => v || undefined),
  /**
   * Walking path requests at once; default 8 for a router on 127.0.0.1/localhost (own
   * osrm-routed in the container), 2 for public servers (FOSSGIS blocks bursts).
   */
  WALK_ROUTER_MAX_IN_FLIGHT: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.coerce.number().int().min(1).max(64).optional(),
  ),
  /** "1": poll ZTM vehicle positions all the time, not only while someone tracks a ride. */
  VEHICLES_ALWAYS_ON: z
    .string()
    .optional()
    .transform((v) => v === "1"),
  /**
   * Pitch mode (services/demo.ts): `record` saves real stories and voice to data/demo/,
   * `replay` serves only those, with no LLM, ElevenLabs or Google Places calls.
   */
  DEMO_MODE: z.enum(["off", "record", "replay"]).default("off"),
  DEBUG_PAGES: z
    .enum(["0", "1"])
    .default("0")
    .transform((v) => v === "1"),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  // Railway holds the new Supabase secret key (sb_secret_…) under its dashboard name; it replaces service_role.
  return EnvSchema.parse({
    ...source,
    SUPABASE_SERVICE_ROLE_KEY: source.SUPABASE_SERVICE_ROLE_KEY || source.SUPABASE_SECRET_KEY,
  });
}
