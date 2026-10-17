import { readdirSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { TransitGraphSchema } from "@sawa/shared";
import { createNetwork } from "../../domain/routing/network";
import type { TransitCalendar, TransitData } from "../../services/ports";

/** Reads the graph built by scripts/transit/build-graph.ts. */
export function loadTransitData(path: string | URL): TransitData {
  const graph = TransitGraphSchema.parse(
    JSON.parse(gunzipSync(readFileSync(path)).toString("utf8")),
  );
  const network = createNetwork(
    graph.stops.map((s) => ({
      id: s.id,
      groupId: s.groupId,
      name: s.name,
      position: { lat: s.lat, lng: s.lng },
    })),
    graph.patterns.map((p) => ({
      id: p.id,
      line: p.line,
      mode: p.mode,
      headsign: p.headsign,
      headwaySec: p.headwaySec,
      stops: p.stops.map(([stopId, atSec, alongM]) => ({ stopId, atSec, alongM })),
      lngLats: p.lngLats,
    })),
  );
  return { network, serviceDate: graph.serviceDate, attribution: graph.attribution };
}

/** The graph used on `date`: that day, else the closest earlier day, else the first day. */
export function pickServiceDate(dates: string[], date: string): string | undefined {
  return dates.filter((d) => d <= date).at(-1) ?? dates[0];
}

/**
 * Reads `dir`/YYYY-MM-DD.json.gz on demand and keeps only the day in use, so a week of graphs
 * costs the memory of one. Throws when `dir` has no graph.
 */
export function loadTransitCalendar(dir: URL): TransitCalendar {
  const dates = readdirSync(dir)
    .map((f) => /^(\d{4}-\d{2}-\d{2})\.json\.gz$/.exec(f)?.[1])
    .filter((d): d is string => d !== undefined)
    .sort();
  if (dates.length === 0) throw new Error(`No transit graph in ${dir.pathname}`);
  let current: TransitData | undefined;
  return {
    dates,
    forDate(date) {
      const pick = pickServiceDate(dates, date) as string;
      if (current?.serviceDate !== pick) current = loadTransitData(new URL(`${pick}.json.gz`, dir));
      return current;
    },
  };
}
