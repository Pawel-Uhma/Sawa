// Trips of one service day → patterns (line + stop sequence) with median timings and headways.
// Pure functions: the IO lives in build-graph.ts.

export type TripStop = { stopId: string; depSec: number; distM: number };

export type TripInfo = {
  routeId: string;
  line: string;
  mode: "tram" | "bus";
  headsign: string;
  shapeId: string;
};

export type PatternAccumulator = {
  key: string;
  trip: TripInfo;
  stopIds: string[];
  distM: number[];
  /** Offsets from the first stop, one array per trip. */
  offsets: number[][];
  firstDepartures: number[];
};

const DAY_START_SEC = 10 * 3600;
const DAY_END_SEC = 20 * 3600;

export function addTrip(
  patterns: Map<string, PatternAccumulator>,
  trip: TripInfo,
  stops: TripStop[],
): void {
  if (stops.length < 2) return;
  const sorted = stops; // stop_times are in stop_sequence order in this feed
  const stopIds = sorted.map((s) => s.stopId);
  const key = `${trip.routeId}|${stopIds.join(",")}`;
  const first = (sorted[0] as TripStop).depSec;
  let acc = patterns.get(key);
  if (!acc) {
    acc = {
      key,
      trip,
      stopIds,
      distM: sorted.map((s) => s.distM),
      offsets: [],
      firstDepartures: [],
    };
    patterns.set(key, acc);
  }
  acc.offsets.push(sorted.map((s) => s.depSec - first));
  acc.firstDepartures.push(first);
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1
    ? (s[mid] as number)
    : ((s[mid - 1] as number) + (s[mid] as number)) / 2;
}

/** Average gap between daytime departures; null when the pattern barely runs during the day. */
export function daytimeHeadwaySec(firstDepartures: number[]): number | null {
  const daytime = firstDepartures.filter((t) => t >= DAY_START_SEC && t < DAY_END_SEC);
  if (daytime.length < 2) return null;
  return (DAY_END_SEC - DAY_START_SEC) / daytime.length;
}

/** Median offset per stop, forced to be non-decreasing. */
export function medianOffsets(offsets: number[][]): number[] {
  const n = offsets[0]?.length ?? 0;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const m = median(offsets.map((o) => o[i] as number));
    out.push(Math.max(m, out[i - 1] ?? 0));
  }
  return out;
}
