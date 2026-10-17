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
  // Empty values (copied from .env.example) mean "not set": the API then serves fake places.
  SUPABASE_URL: z
    .string()
    .optional()
    .transform((s) => s || undefined),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .optional()
    .transform((s) => s || undefined),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return EnvSchema.parse(source);
}
