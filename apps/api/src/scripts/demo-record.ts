/**
 * Records stories and voice for the pitch (DEMO_MODE=record, services/demo.ts).
 * Plans the rides people will start from 42 Warsaw and Kercelak (interests, durations, walk and
 * transit, loops and the demo destinations), then asks the API for each place's story with its
 * voice, so the API saves them to apps/api/data/demo/. Places heard first go first: when credits
 * run out, the start of every ride is already recorded.
 *
 *   DEMO_MODE=record pnpm --filter @sawa/api dev       # in one terminal
 *   pnpm --filter @sawa/api demo:record                # in another
 *
 * --within 10 (only places heard in the first 10 min of a ride), --max 40, --parallel 3, --dry.
 *
 * PLAN_API_URL=<deployed API> plans the rides there, with the walking paths production has.
 *
 * Each new place costs one LLM story and one ElevenLabs clip; saved ones cost nothing.
 */
import {
  HACKATHON_VENUE,
  type Interest,
  type LatLng,
  type PlanRouteRequest,
  type Route,
} from "@sawa/shared";
import { DEMO_DESTINATIONS } from "../services/demo";

const API = process.env.API_URL ?? "http://localhost:8787";
/** Rides can be planned by the deployed API (its own walking router), stories still by `API`. */
const PLAN_API = process.env.PLAN_API_URL ?? API;
const maxArg = process.argv.indexOf("--max");
const MAX_PLACES = maxArg > 0 ? Number(process.argv[maxArg + 1]) : Number.POSITIVE_INFINITY;
const DRY = process.argv.includes("--dry");
const withinArg = process.argv.indexOf("--within");
/** Only places heard this many minutes into some ride: the start of every ride from the venue. */
const WITHIN_SEC =
  withinArg > 0 ? Number(process.argv[withinArg + 1]) * 60 : Number.POSITIVE_INFINITY;
const parallelArg = process.argv.indexOf("--parallel");
const PARALLEL = parallelArg > 0 ? Number(process.argv[parallelArg + 1]) : 1;

const ORIGINS: Record<string, LatLng> = {
  "42 Warsaw": HACKATHON_VENUE,
  Kercelak: { lat: 52.23702, lng: 20.98019 },
};
const DURATIONS = [15, 30, 60, 90, 120];
const INTEREST_SETS: Interest[][] = [
  ["historical"],
  ["cultural"],
  ["sports"],
  ["nature"],
  ["historical", "cultural"],
  ["historical", "cultural", "sports", "nature"],
];
/** Onboarding answers that change the plan (familiarity, story style); none = skipped. */
const LISTENERS: Pick<PlanRouteRequest, "familiarity" | "storyStyle">[] = [
  {},
  { familiarity: "first_time", storyStyle: "fun" },
  { familiarity: "local", storyStyle: "deep" },
];

function rides(): [string, PlanRouteRequest][] {
  const out: [string, PlanRouteRequest][] = [];
  for (const [from, origin] of Object.entries(ORIGINS)) {
    for (const durationMin of DURATIONS)
      for (const interests of INTEREST_SETS)
        for (const travel of ["transit", "walk"] as const)
          for (const listener of LISTENERS)
            out.push([
              `${from} ${durationMin} min ${interests} ${travel}`,
              { origin, durationMin, interests, returnToStart: true, travel, ...listener },
            ]);
  }
  // "Do celu" from the venue: the fastest way and an hour's ride to each fixed destination.
  for (const d of DEMO_DESTINATIONS)
    for (const durationMin of [undefined, 60])
      out.push([
        `→ ${d.name} ${durationMin ?? "fastest"}`,
        {
          origin: HACKATHON_VENUE,
          durationMin,
          interests: ["historical", "cultural"],
          destination: d.position,
          travel: "transit",
        },
      ]);
  return out;
}

async function post(path: string, body: unknown, base = API): Promise<Response> {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const health = await fetch(`${API}/health`).then((r) => r.json() as Promise<{ demoMode?: string }>);
if (!DRY && health.demoMode !== "record") {
  console.error(`${API} is not in DEMO_MODE=record (health: ${JSON.stringify(health)})`);
  process.exit(1);
}

// Place id → the longest story window it was planned with (so the story fits every ride) and
// how soon after the start it is heard.
const places = new Map<string, { name: string; targetSec: number; firstSec: number; n: number }>();
const all = rides();
for (const [i, [label, request]] of all.entries()) {
  const res = await post("/v1/routes/plan", request, PLAN_API);
  if (!res.ok) {
    console.warn(`plan ${label}: ${res.status}`);
    continue;
  }
  const route = (await res.json()) as Route;
  for (const p of route.places) {
    const seen = places.get(p.placeId);
    places.set(p.placeId, {
      name: p.name,
      targetSec: Math.max(30, Math.round(p.windowSec), seen?.targetSec ?? 0),
      firstSec: Math.min(p.etaSec, seen?.firstSec ?? Number.POSITIVE_INFINITY),
      n: (seen?.n ?? 0) + 1,
    });
  }
  if ((i + 1) % 25 === 0) console.log(`planned ${i + 1}/${all.length}, ${places.size} places`);
}

for (const min of [2, 5, 10, 15, 20, 30]) {
  const n = [...places.values()].filter((p) => p.firstSec <= min * 60).length;
  console.log(`heard within ${min} min: ${n} places`);
}
const todo = [...places]
  .filter(([, p]) => p.firstSec <= WITHIN_SEC)
  .sort(([, a], [, b]) => a.firstSec - b.firstSec || b.n - a.n)
  .slice(0, MAX_PLACES);
console.log(`${places.size} places on ${all.length} rides, recording ${todo.length}`);
if (DRY) process.exit(0);
let next = 0;
async function worker() {
  while (next < todo.length) {
    const i = next++;
    const [placeId, { name, targetSec }] = todo[i] ?? [];
    if (!placeId || !targetSec) continue;
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
}
await Promise.all(Array.from({ length: PARALLEL }, worker));
console.log("Done: commit apps/api/data/demo/ and deploy with DEMO_MODE=replay.");
