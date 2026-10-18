/**
 * Records stories and voice for the pitch (DEMO_MODE=record, services/demo.ts).
 * Plans the rides people will start from 42 Warsaw and Kercelak, then asks the API for each
 * place's story with its voice, so the API saves them to apps/api/data/demo/.
 *
 *   DEMO_MODE=record pnpm --filter @sawa/api dev       # in one terminal
 *   pnpm --filter @sawa/api demo:record -- --max 40    # in another
 *
 * Each new place costs one LLM story and one ElevenLabs clip; saved ones cost nothing.
 */
import { HACKATHON_VENUE, type Interest, type LatLng, type Route } from "@sawa/shared";

const API = process.env.API_URL ?? "http://localhost:8787";
const maxArg = process.argv.indexOf("--max");
const MAX_PLACES = maxArg > 0 ? Number(process.argv[maxArg + 1]) : 30;

const ORIGINS: Record<string, LatLng> = {
  "42 Warsaw": HACKATHON_VENUE,
  Kercelak: { lat: 52.23702, lng: 20.98019 },
};
const DURATIONS = [15, 30, 60];
const INTEREST_SETS: Interest[][] = [["historical", "cultural"], ["historical"], ["cultural"]];

async function post(path: string, body: unknown): Promise<Response> {
  return fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const health = await fetch(`${API}/health`).then((r) => r.json() as Promise<{ demoMode?: string }>);
if (health.demoMode !== "record") {
  console.error(`${API} is not in DEMO_MODE=record (health: ${JSON.stringify(health)})`);
  process.exit(1);
}

// Place id → the longest story window it was planned with, so the story fits every ride.
const places = new Map<string, { name: string; targetSec: number }>();
for (const [from, origin] of Object.entries(ORIGINS)) {
  for (const durationMin of DURATIONS) {
    for (const interests of INTEREST_SETS) {
      const res = await post("/v1/routes/plan", { origin, durationMin, interests });
      if (!res.ok) {
        console.warn(`plan ${from} ${durationMin} min ${interests}: ${res.status}`);
        continue;
      }
      const route = (await res.json()) as Route;
      for (const p of route.places) {
        const seen = places.get(p.placeId);
        const targetSec = Math.max(30, Math.round(p.windowSec), seen?.targetSec ?? 0);
        places.set(p.placeId, { name: p.name, targetSec });
      }
    }
  }
}

const todo = [...places].slice(0, MAX_PLACES);
console.log(`${places.size} places on the rides, recording ${todo.length}`);
for (const [i, [placeId, { name, targetSec }]] of todo.entries()) {
  const started = Date.now();
  const res = await post("/v1/stories/audio", {
    placeId,
    targetSec,
    interests: ["historical", "cultural"],
  });
  const kb = res.ok ? Math.round((await res.arrayBuffer()).byteLength / 1024) : 0;
  const status = res.ok ? `${kb} KB` : `HTTP ${res.status}`;
  console.log(`${i + 1}/${todo.length} ${name}: ${status}, ${Date.now() - started} ms`);
}
console.log("Done: commit apps/api/data/demo/ and deploy with DEMO_MODE=replay.");
