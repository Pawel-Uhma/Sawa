import type { Health } from "@sawa/shared";
import { Hono } from "hono";

const VERSION = process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";

export const healthRoutes = new Hono().get("/health", (c) =>
  c.json({ ok: true, version: VERSION } satisfies Health),
);
