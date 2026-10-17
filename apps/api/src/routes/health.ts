import type { Health } from "@sawa/shared";
import { Hono } from "hono";

const VERSION = process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";

/** Today's date in Warsaw, YYYY-MM-DD. */
export function warsawDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(now);
}

/**
 * `GET /health`. With `transitDate` it also says whether the GTFS snapshot is for today:
 * the graph is built for one day, so after midnight it needs a rebuild (T-18).
 */
export function createHealthRoutes(transitDate?: string, clock: () => Date = () => new Date()) {
  return new Hono().get("/health", (c) =>
    c.json({
      ok: true,
      version: VERSION,
      ...(transitDate ? { transitDate, transitIsToday: transitDate === warsawDate(clock()) } : {}),
    } satisfies Health),
  );
}

export const healthRoutes = createHealthRoutes();
