// Builds apps/api/data/transit/YYYY-MM-DD.json.gz, one graph per service day, from the Warsaw
// GTFS (https://mkuran.pl/gtfs/). The API picks the graph for today (T-18).
// Usage: pnpm --filter @sawa/scripts transit [--zip path/to/warsaw.zip] [--date 2026-10-18] [--days 7]
// Defaults: from today, 7 days; days the GTFS does not cover are skipped, older files removed.
// License: ZTM Warszawa data usage terms + ODbL for shapes; attribution is kept in the output.

import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { gzipSync } from "node:zlib";
import { type TransitGraph, TransitGraphSchema } from "@sawa/shared";
import { Unzip, UnzipInflate } from "fflate";
import {
  addTrip,
  daytimeHeadwaySec,
  medianOffsets,
  type PatternAccumulator,
  type TripInfo,
  type TripStop,
} from "./aggregate";
import { csvStream, gtfsTimeToSec } from "./csv";
import { lengthM, simplifyLine } from "./simplify";

type LngLat = [number, number];

const GTFS_URL = "https://mkuran.pl/gtfs/warsaw.zip";
const OUT_DIR = resolve(import.meta.dirname, "../../apps/api/data/transit");
const DEFAULT_DAYS = 7;
const SIMPLIFY_TOLERANCE_M = 5;
const MODES: Record<string, "tram" | "bus"> = { "0": "tram", "3": "bus" };

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const round = (n: number, digits: number) => Math.round(n * 10 ** digits) / 10 ** digits;

async function ensureZip(): Promise<string> {
  const given = arg("zip");
  if (given) return given;
  const path = join(tmpdir(), "sawa-warsaw-gtfs.zip");
  const fresh = existsSync(path) && Date.now() - statSync(path).mtimeMs < 6 * 3600 * 1000;
  if (!fresh) {
    console.log(`Downloading ${GTFS_URL} …`);
    const res = await fetch(GTFS_URL);
    if (!res.ok || !res.body) throw new Error(`GTFS download failed: HTTP ${res.status}`);
    await pipeline(Readable.fromWeb(res.body as never), createWriteStream(path));
  }
  return path;
}

/** Streams the chosen files out of the zip; each handler gets decompressed chunks. */
function readZip(
  path: string,
  handlers: Record<string, (chunk: Uint8Array, final: boolean) => void>,
) {
  return new Promise<void>((done, fail) => {
    const unzip = new Unzip();
    unzip.register(UnzipInflate);
    unzip.onfile = (file) => {
      const handle = handlers[file.name];
      if (!handle) return;
      file.ondata = (err, chunk, final) => (err ? fail(err) : handle(chunk, final));
      file.start();
    };
    createReadStream(path)
      .on("data", (chunk) => unzip.push(chunk as Uint8Array))
      .on("end", () => {
        unzip.push(new Uint8Array(0), true);
        done();
      })
      .on("error", fail);
  });
}

function collect(rows: Record<string, string>[]) {
  return csvStream((row) => rows.push(row));
}

/** `date` plus `n` days, YYYY-MM-DD. */
function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

class NoServiceError extends Error {}

async function main() {
  const start =
    arg("date") ??
    new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" }).format(new Date());
  const days = Number(arg("days") ?? DEFAULT_DAYS);
  const zip = await ensureZip();
  mkdirSync(OUT_DIR, { recursive: true });

  let built = 0;
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    try {
      await buildDay(zip, date);
      built++;
    } catch (err) {
      if (!(err instanceof NoServiceError)) throw err;
      console.warn(err.message);
    }
  }
  if (built === 0) throw new Error(`No service from ${start} for ${days} days in this GTFS`);

  for (const file of readdirSync(OUT_DIR)) {
    const date = file.replace(/\.json\.gz$/, "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date < start) {
      rmSync(join(OUT_DIR, file));
      console.log(`removed ${file}`);
    }
  }
}

async function buildDay(zip: string, date: string) {
  console.log(`GTFS ${zip}, service date ${date}`);

  // Pass 1: small tables.
  const routes: Record<string, string>[] = [];
  const calendar: Record<string, string>[] = [];
  const stopsRows: Record<string, string>[] = [];
  const attributions: Record<string, string>[] = [];
  const tripsById = new Map<string, TripInfo>();
  const services = new Set<string>();
  const routeInfo = new Map<string, { line: string; mode: "tram" | "bus" }>();
  const tripRows: Record<string, string>[] = [];
  await readZip(zip, {
    "routes.txt": collect(routes),
    "calendar_dates.txt": collect(calendar),
    "stops.txt": collect(stopsRows),
    "attributions.txt": collect(attributions),
    "trips.txt": collect(tripRows),
  });

  const ymd = date.replaceAll("-", "");
  for (const c of calendar)
    if (c.date === ymd && c.exception_type === "1") services.add(c.service_id as string);
  if (services.size === 0) throw new NoServiceError(`No service on ${date} in this GTFS, skipped`);
  for (const r of routes) {
    const mode = MODES[r.route_type as string];
    if (mode) routeInfo.set(r.route_id as string, { line: r.route_short_name as string, mode });
  }
  for (const t of tripRows) {
    const route = routeInfo.get(t.route_id as string);
    if (!route || !services.has(t.service_id as string)) continue;
    tripsById.set(t.trip_id as string, {
      routeId: t.route_id as string,
      line: route.line,
      mode: route.mode,
      headsign: t.trip_headsign as string,
      shapeId: t.shape_id as string,
    });
  }
  tripRows.length = 0;
  console.log(`${routeInfo.size} tram/bus routes, ${tripsById.size} trips on ${date}`);

  // Pass 2: stop times and shapes, only for the kept trips.
  const neededShapes = new Set([...tripsById.values()].map((t) => t.shapeId));
  const tripStops = new Map<string, (TripStop & { seq: number })[]>();
  const shapes = new Map<string, { seq: number; lngLat: LngLat }[]>();
  await readZip(zip, {
    "stop_times.txt": csvStream((r) => {
      const tripId = r.trip_id as string;
      if (!tripsById.has(tripId)) return;
      const list = tripStops.get(tripId) ?? [];
      list.push({
        stopId: r.stop_id as string,
        depSec: gtfsTimeToSec(r.departure_time as string),
        distM: Number(r.shape_dist_traveled) * 1000,
        seq: Number(r.stop_sequence),
      });
      tripStops.set(tripId, list);
    }),
    "shapes.txt": csvStream((r) => {
      const id = r.shape_id as string;
      if (!neededShapes.has(id)) return;
      const list = shapes.get(id) ?? [];
      list.push({
        seq: Number(r.shape_pt_sequence),
        lngLat: [Number(r.shape_pt_lon), Number(r.shape_pt_lat)],
      });
      shapes.set(id, list);
    }),
  });

  const accumulators = new Map<string, PatternAccumulator>();
  for (const [tripId, stops] of tripStops) {
    addTrip(
      accumulators,
      tripsById.get(tripId) as TripInfo,
      stops.sort((a, b) => a.seq - b.seq),
    );
  }
  console.log(`${accumulators.size} stop sequences before filtering`);

  const stopById = new Map(stopsRows.map((s) => [s.stop_id as string, s]));
  const usedStops = new Set<string>();
  const patterns: TransitGraph["patterns"] = [];
  const sortedAccs = [...accumulators.values()].sort(
    (a, b) =>
      a.trip.line.localeCompare(b.trip.line, "pl", { numeric: true }) || a.key.localeCompare(b.key),
  );
  const perLine = new Map<string, number>();
  for (const acc of sortedAccs) {
    const headwaySec = daytimeHeadwaySec(acc.firstDepartures);
    if (headwaySec === null) continue;
    const offsets = medianOffsets(acc.offsets);

    const shape = (shapes.get(acc.trip.shapeId) ?? [])
      .sort((a, b) => a.seq - b.seq)
      .map((p) => p.lngLat);
    const fallback = acc.stopIds.map((id) => {
      const s = stopById.get(id);
      return [Number(s?.stop_lon), Number(s?.stop_lat)] as LngLat;
    });
    const full = shape.length >= 2 ? shape : fallback;
    const simplified = simplifyLine(full, SIMPLIFY_TOLERANCE_M);
    const fullLen = lengthM(full);
    const scale = fullLen > 0 ? lengthM(simplified) / fullLen : 1;

    const n = (perLine.get(acc.trip.line) ?? 0) + 1;
    perLine.set(acc.trip.line, n);
    for (const id of acc.stopIds) usedStops.add(id);
    patterns.push({
      id: `${acc.trip.line}:${n}`,
      line: acc.trip.line,
      mode: acc.trip.mode,
      headsign: acc.trip.headsign,
      headwaySec: Math.round(headwaySec),
      stops: acc.stopIds.map((id, i) => [
        id,
        Math.round(offsets[i] as number),
        Math.round((acc.distM[i] as number) * scale),
      ]),
      lngLats: simplified.map(([lng, lat]) => [round(lng, 5), round(lat, 5)]),
    });
  }

  const graph: TransitGraph = TransitGraphSchema.parse({
    version: 1,
    serviceDate: date,
    generatedAt: new Date().toISOString(),
    attribution: [
      ...attributions.map((a) => `${a.organization_name} (${a.attribution_url})`),
      "Kształty tras: © OpenStreetMap contributors (ODbL)",
    ],
    stops: [...usedStops].sort().map((id) => {
      const s = stopById.get(id);
      return {
        id,
        groupId: /^\d{6}$/.test(id) ? id.slice(0, 4) : id,
        name: s?.stop_name ?? id,
        lat: Number(s?.stop_lat),
        lng: Number(s?.stop_lon),
      };
    }),
    patterns,
  });

  const out = join(OUT_DIR, `${date}.json.gz`);
  const gz = gzipSync(JSON.stringify(graph), { level: 9 });
  writeFileSync(out, gz);
  console.log(
    `${patterns.length} patterns (${perLine.size} lines), ${graph.stops.length} stops → ${out} (${(gz.length / 1e6).toFixed(2)} MB)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
