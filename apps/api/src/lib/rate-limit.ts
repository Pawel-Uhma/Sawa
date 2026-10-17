import type { MiddlewareHandler } from "hono";
import { AppError } from "./errors";

export type RateLimitOpts = {
  /** Requests one client may make per window. */
  limit: number;
  windowMs: number;
  now?: () => number;
};

/**
 * Fixed-window limit per client IP, in memory (one Railway instance).
 * Railway sits behind a proxy, so the client is the first `x-forwarded-for` entry.
 */
export function rateLimit({ limit, windowMs, now = Date.now }: RateLimitOpts): MiddlewareHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return async (c, next) => {
    const t = now();
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    let hit = hits.get(ip);
    if (!hit || hit.resetAt <= t) {
      // Expired windows are dropped on the way, so the map does not grow without bound.
      for (const [key, h] of hits) if (h.resetAt <= t) hits.delete(key);
      hit = { count: 0, resetAt: t + windowMs };
      hits.set(ip, hit);
    }
    hit.count += 1;
    if (hit.count > limit) {
      c.header("Retry-After", String(Math.ceil((hit.resetAt - t) / 1000)));
      throw new AppError("RATE_LIMITED", "Too many requests, try again later");
    }
    await next();
  };
}
