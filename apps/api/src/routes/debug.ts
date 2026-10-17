import { readFileSync } from "node:fs";
import { HACKATHON_VENUE, INTERESTS } from "@sawa/shared";
import { Hono } from "hono";

const TEMPLATE = readFileSync(new URL("./debug-planner.html", import.meta.url), "utf8");

/** Developer pages, mounted only with DEBUG_PAGES=1. */
export function createDebugRoutes() {
  const html = TEMPLATE.replace(
    "/*__CONFIG__*/",
    `window.SAWA = ${JSON.stringify({ interests: INTERESTS, venue: HACKATHON_VENUE })};`,
  );
  return new Hono().get("/debug/planner", (c) => c.html(html));
}
