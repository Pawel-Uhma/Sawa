import type { PatternStop } from "../routing/types";
import type { PatternGeometry } from "./along";
import type { AlongSample, Knot, SpeedSource, VehicleOnPattern } from "./types";

/** A vehicle standing this close to the first stop waits at the terminus (layover). */
const TERMINUS_ZONE_M = 200;
/** A leader that passed this long before is no longer a hint about traffic. */
const MAX_LEADER_GAP_MS = 30 * 60_000;
/** Used only where the GTFS times of two stops are equal. */
const FALLBACK_SPEED_MPS = 6;

/**
 * When the samples first reached `alongM` (samples are monotone, oldest first).
 * Undefined when they start past it or never get there.
 */
export function timeAtAlong(samples: AlongSample[], alongM: number): number | undefined {
  const i = samples.findIndex((s) => s.alongM >= alongM);
  if (i < 0) return undefined;
  const b = samples[i] as AlongSample;
  if (i === 0) return b.alongM === alongM ? b.atMs : undefined;
  const a = samples[i - 1] as AlongSample;
  const t = (alongM - a.alongM) / (b.alongM - a.alongM);
  return a.atMs + t * (b.atMs - a.atMs);
}

/** Position along the shape at `atMs`, clamped to the first and last knot. */
export function alongAtTime(knots: Knot[], atMs: number): number {
  const i = knots.findIndex((k) => k.atMs >= atMs);
  if (i < 0) return knots.at(-1)?.alongM ?? 0;
  const b = knots[i] as Knot;
  if (i === 0) return b.alongM;
  const a = knots[i - 1] as Knot;
  const span = b.atMs - a.atMs;
  return span > 0 ? a.alongM + ((atMs - a.atMs) / span) * (b.alongM - a.alongM) : b.alongM;
}

/** GTFS seconds from the first stop at a distance along the pattern (linear between stops). */
export function scheduledSecAt(stops: PatternStop[], alongM: number): number {
  const i = stops.findIndex((s) => s.alongM >= alongM);
  if (i < 0) return stops.at(-1)?.atSec ?? 0;
  const b = stops[i] as PatternStop;
  if (i === 0) return b.atSec;
  const a = stops[i - 1] as PatternStop;
  const span = b.alongM - a.alongM;
  return span > 0 ? a.atSec + ((alongM - a.alongM) / span) * (b.atSec - a.atSec) : b.atSec;
}

/** The nearest vehicle ahead that already drove past `from`, recently enough to tell the traffic. */
function findLeader(
  vehicle: VehicleOnPattern,
  others: VehicleOnPattern[],
  from: Knot,
): { leader: VehicleOnPattern; passedAtMs: number } | undefined {
  let best: { leader: VehicleOnPattern; passedAtMs: number; aheadM: number } | undefined;
  for (const other of others) {
    if (other.history.id === vehicle.history.id) continue;
    const aheadM = (other.along.at(-1)?.alongM ?? 0) - from.alongM;
    if (aheadM <= 0) continue;
    const passedAtMs = timeAtAlong(other.along, from.alongM);
    if (passedAtMs === undefined || from.atMs - passedAtMs > MAX_LEADER_GAP_MS) continue;
    if (!best || aheadM < best.aheadM) best = { leader: other, passedAtMs, aheadM };
  }
  return best;
}

/** Continues `knots` stop by stop at timetable speed until both limits are reached. */
function extendBySchedule(
  knots: Knot[],
  geometry: PatternGeometry,
  untilMs: number,
  untilAlongM: number,
): void {
  const { stops } = geometry.pattern;
  let cur = knots.at(-1) as Knot;
  for (const stop of stops) {
    if (cur.atMs >= untilMs && cur.alongM >= untilAlongM) break;
    if (stop.alongM <= cur.alongM) continue;
    const sec = stop.atSec - scheduledSecAt(stops, cur.alongM);
    const dtMs = sec > 0 ? sec * 1000 : ((stop.alongM - cur.alongM) / FALLBACK_SPEED_MPS) * 1000;
    cur = { atMs: cur.atMs + dtMs, alongM: stop.alongM };
    knots.push(cur);
  }
}

export type Prediction = { knots: Knot[]; source: SpeedSource };

/**
 * Where the vehicle will be, as knots from its last report. The stretch the previous
 * vehicle of the line already drove is copied with its timing (a jam it stood in a minute
 * ago will most likely hold this one too); past the leader the GTFS timetable speed is used.
 * Knots reach at least `untilMs` and `untilAlongM` (or the end of the pattern).
 */
export function predictKnots(
  vehicle: VehicleOnPattern,
  others: VehicleOnPattern[],
  geometry: PatternGeometry,
  untilMs: number,
  untilAlongM = 0,
): Prediction {
  const start = vehicle.along.at(-1) as Knot;
  const knots: Knot[] = [start];
  if (vehicle.standing && start.alongM < TERMINUS_ZONE_M) {
    knots.push({ atMs: Math.max(untilMs, start.atMs), alongM: start.alongM });
    return { knots, source: "hold" };
  }
  let source: SpeedSource = "schedule";
  const lead = findLeader(vehicle, others, start);
  if (lead) {
    for (const s of lead.leader.along) {
      if (s.alongM <= start.alongM) continue;
      knots.push({ atMs: start.atMs + (s.atMs - lead.passedAtMs), alongM: s.alongM });
      source = "leader";
      if (s.atMs - lead.passedAtMs + start.atMs >= untilMs && s.alongM >= untilAlongM) break;
    }
  }
  extendBySchedule(knots, geometry, untilMs, untilAlongM);
  const last = knots.at(-1) as Knot;
  // Past the last stop it stands there until the horizon.
  if (last.atMs < untilMs) knots.push({ atMs: untilMs, alongM: last.alongM });
  return { knots, source };
}
