import {
  type LegVehicles,
  type LiveVehicle,
  type TrackLeg,
  type TrackVehiclesRequest,
  type TrackVehiclesResponse,
  VEHICLES_REFRESH_SEC,
} from "@sawa/shared";
import type { Network, PatternStop } from "../domain/routing/types";
import {
  type PatternGeometry,
  toPatternGeometry,
  vehiclesOnPattern,
} from "../domain/vehicles/along";
import { appendReports } from "../domain/vehicles/history";
import {
  alongAtTime,
  type Prediction,
  predictKnots,
  scheduledSecAt,
  timeAtAlong,
} from "../domain/vehicles/predict";
import { pickAroundBoarding } from "../domain/vehicles/select";
import { knotsToTrack } from "../domain/vehicles/track";
import type { VehicleHistory, VehicleOnPattern } from "../domain/vehicles/types";
import type { TransitCalendar, TransitData, VehiclePositionSource } from "./ports";
import { transitOn } from "./transit-day";

const POLL_MS = VEHICLES_REFRESH_SEC * 1000;
/** Longer than the leader gap in predict.ts, so a leader's whole stretch is still known. */
const KEEP_MS = 35 * 60_000;
/** Keeps polling this long after the last request, so leaders have a history when asked again. */
const WARM_MS = 20 * 60_000;
/** How far past now the track runs; covers a few missed refreshes. */
const TRACK_AHEAD_MS = 2 * 60_000;
const MIN_TOLERANCE_MS = 15 * 60_000;
/** A vehicle that left the stop this long ago may still be the one the rider just boarded. */
const BOARD_GRACE_MS = 60_000;

export const VEHICLES_ATTRIBUTION =
  "Lokalizacja pojazdów: Zarząd Transportu Miejskiego, dane.um.warszawa.pl (CC BY)";

export type VehicleTracker = {
  track(request: TrackVehiclesRequest): Promise<TrackVehiclesResponse>;
  /** Background polling: always with `alwaysOn`, otherwise for WARM_MS after start and each request. */
  start(): void;
  stop(): void;
};

/** Structural subset of pino, so the service does not depend on the logger library. */
type TrackerLogger = { warn(obj: object, msg: string): void };

type LegContext = {
  geometry: PatternGeometry;
  /** All patterns of the line, this one included. */
  siblings: PatternGeometry[];
  board: PatternStop;
};

/** The pattern a planned leg rides: its line, calling at both stops in this order. */
function findLeg(network: Network, leg: TrackLeg): LegContext | undefined {
  const siblings = [...network.patterns.values()]
    .filter((p) => p.line === leg.line)
    .map(toPatternGeometry);
  for (const geometry of siblings) {
    const { stops } = geometry.pattern;
    const from = stops.findIndex((s) => s.stopId === leg.fromStopId);
    if (from < 0 || !stops.slice(from + 1).some((s) => s.stopId === leg.toStopId)) continue;
    return { geometry, siblings, board: stops[from] as PatternStop };
  }
  return undefined;
}

/** When it is or was at the boarding stop; for one already past it, from its history or the timetable. */
function boardAtMs(v: VehicleOnPattern, prediction: Prediction, ctx: LegContext) {
  const last = v.along.at(-1);
  if (!last) return undefined;
  const boardM = ctx.board.alongM;
  if (last.alongM < boardM) return timeAtAlong(prediction.knots, boardM);
  const stops = ctx.geometry.pattern.stops;
  return (
    timeAtAlong(v.along, boardM) ??
    last.atMs - (scheduledSecAt(stops, last.alongM) - ctx.board.atSec) * 1000
  );
}

function toLiveVehicle(
  history: VehicleHistory,
  role: LiveVehicle["role"],
  prediction: Prediction,
  boardAt: number | undefined,
  geometry: PatternGeometry,
  nowMs: number,
): LiveVehicle {
  const last = history.samples.at(-1) as VehicleHistory["samples"][number];
  return {
    id: history.id,
    line: history.line,
    mode: history.mode,
    brigade: history.brigade,
    role,
    position: last.position,
    reportedAt: new Date(last.atMs).toISOString(),
    ...(boardAt === undefined ? {} : { boardAt: new Date(boardAt).toISOString() }),
    speedSource: prediction.source,
    track: knotsToTrack(prediction.knots, geometry, nowMs + TRACK_AHEAD_MS),
  };
}

function trackLeg(
  histories: Map<string, VehicleHistory>,
  ctx: LegContext,
  leg: TrackLeg,
  nowMs: number,
): LiveVehicle[] {
  const { geometry } = ctx;
  const onPattern = vehiclesOnPattern(histories.values(), geometry, nowMs, ctx.siblings);
  const rows = onPattern.map((v) => {
    const prediction = predictKnots(
      v,
      onPattern,
      geometry,
      nowMs + TRACK_AHEAD_MS,
      ctx.board.alongM,
    );
    return {
      v,
      prediction,
      boardAt: boardAtMs(v, prediction, ctx),
      alongNowM: alongAtTime(prediction.knots, nowMs),
    };
  });
  const tolerance = Math.max(MIN_TOLERANCE_MS, 2 * geometry.pattern.headwaySec * 1000);
  const departAtMs = Date.parse(leg.departAt);
  const pick = pickAroundBoarding(
    rows.map((r) => ({ id: r.v.history.id, alongNowM: r.alongNowM, boardAtMs: r.boardAt })),
    departAtMs,
    tolerance,
    departAtMs > nowMs ? nowMs - BOARD_GRACE_MS : undefined,
  );
  if (!pick) return [];
  const roles = new Map<string, LiveVehicle["role"]>([[pick.ride, "ride"]]);
  if (pick.ahead) roles.set(pick.ahead, "ahead");
  if (pick.behind) roles.set(pick.behind, "behind");
  return rows
    .filter((r) => roles.has(r.v.history.id))
    .sort((a, b) => b.alongNowM - a.alongNowM)
    .map((r) =>
      toLiveVehicle(
        r.v.history,
        roles.get(r.v.history.id) as LiveVehicle["role"],
        r.prediction,
        r.boardAt,
        geometry,
        nowMs,
      ),
    );
}

export function createVehicleTracker(deps: {
  /** Missing (no WAW_TOKEN) → responses with `live: false`. */
  source?: VehiclePositionSource;
  /** One service day (tests) or the calendar of built days (production). */
  transit: TransitData | TransitCalendar;
  clock?: () => number;
  logger?: TrackerLogger;
  alwaysOn?: boolean;
}): VehicleTracker {
  const clock = deps.clock ?? Date.now;
  const histories = new Map<string, VehicleHistory>();
  const legs = new Map<string, LegContext | undefined>();
  let inFlight: Promise<void> | undefined;
  let lastAttemptMs = Number.NEGATIVE_INFINITY;
  let warmUntilMs = Number.NEGATIVE_INFINITY;
  let stale = false;
  let timer: ReturnType<typeof setInterval> | undefined;

  function refresh(): Promise<void> {
    const source = deps.source;
    if (!source) return Promise.resolve();
    if (inFlight) return inFlight;
    lastAttemptMs = clock();
    inFlight = source
      .positions()
      .then((reports) => {
        appendReports(histories, reports, clock(), KEEP_MS);
        stale = false;
      })
      .catch((err: unknown) => {
        stale = true;
        deps.logger?.warn({ err }, "vehicle positions failed, serving the last ones");
      })
      .finally(() => {
        inFlight = undefined;
      });
    return inFlight;
  }

  function legContext(transit: TransitData, leg: TrackLeg): LegContext | undefined {
    const key = `${transit.serviceDate}|${leg.line}|${leg.fromStopId}|${leg.toStopId}`;
    if (!legs.has(key)) legs.set(key, findLeg(transit.network, leg));
    return legs.get(key);
  }

  return {
    async track(request) {
      warmUntilMs = clock() + WARM_MS;
      if (clock() - lastAttemptMs >= POLL_MS) await refresh();
      const nowMs = clock();
      const transit = transitOn(deps.transit, new Date(nowMs));
      const out: LegVehicles[] = request.legs.map((leg, i) => {
        const legIndex = leg.legIndex ?? i;
        const ctx = legContext(transit, leg);
        if (!ctx) return { legIndex, line: leg.line, unknownLeg: true, vehicles: [] };
        return { legIndex, line: leg.line, vehicles: trackLeg(histories, ctx, leg, nowMs) };
      });
      return {
        generatedAt: new Date(nowMs).toISOString(),
        live: Boolean(deps.source),
        stale,
        refreshSec: VEHICLES_REFRESH_SEC,
        legs: out,
        attribution: [VEHICLES_ATTRIBUTION, ...transit.attribution],
      };
    },
    start() {
      if (!deps.source || timer) return;
      warmUntilMs = clock() + WARM_MS;
      timer = setInterval(() => {
        if (deps.alwaysOn || clock() < warmUntilMs) void refresh();
      }, POLL_MS);
      timer.unref();
      void refresh();
    },
    stop() {
      clearInterval(timer);
      timer = undefined;
    },
  };
}

/** No transit data or token (tests, offline demo): every leg without vehicles, `live: false`. */
export function createDisabledVehicleTracker(clock: () => number = Date.now): VehicleTracker {
  return {
    async track(request) {
      return {
        generatedAt: new Date(clock()).toISOString(),
        live: false,
        stale: false,
        refreshSec: VEHICLES_REFRESH_SEC,
        legs: request.legs.map((leg, i) => ({
          legIndex: leg.legIndex ?? i,
          line: leg.line,
          vehicles: [],
        })),
        attribution: [],
      };
    },
    start() {},
    stop() {},
  };
}
