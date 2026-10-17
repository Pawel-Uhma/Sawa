import { Hono } from "hono";
import { cors } from "hono/cors";
import { AppError, toErrorBody } from "./lib/errors";
import { healthRoutes } from "./routes/health";

export type AppConfig = {
  corsOrigins: string[];
  corsPreviewPattern?: string;
  onUnexpectedError?: (err: unknown) => void;
};

/** Composition root: wires adapters into services and mounts routes. */
export function createApp(config: AppConfig) {
  const previewPattern = config.corsPreviewPattern ? new RegExp(config.corsPreviewPattern) : null;

  return new Hono()
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
    .route("/", healthRoutes);
}

/** Used by apps/web for the typed `hc` client. */
export type AppType = ReturnType<typeof createApp>;
