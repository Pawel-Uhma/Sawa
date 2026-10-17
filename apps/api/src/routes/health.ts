import type { Health } from "@sawa/shared";
import { Hono } from "hono";

import { warsawDate } from "../lib/warsaw-date";

export { warsawDate };

const VERSION = process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";

/**
 * `GET /health`. With `transitDate` it also says whether the GTFS snapshot in use is for today:
 * each graph covers one day, and when the built days run out the last one stays (T-18).
 */
export function createHealthRoutes(
  transitDate?: string | ((now: Date) => string),
  clock: () => Date = () => new Date(),
) {
  return new Hono().get("/health", (c) => {
    const now = clock();
    const date = typeof transitDate === "function" ? transitDate(now) : transitDate;
    return c.json({
      ok: true,
      version: VERSION,
      ...(date ? { transitDate: date, transitIsToday: date === warsawDate(now) } : {}),
    } satisfies Health);
  });
}

export const healthRoutes = createHealthRoutes();
