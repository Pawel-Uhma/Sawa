import { isTransitMode, type Leg } from "@sawa/shared";
import { type Lang, pick } from "@/features/i18n";

// Rozkład ZTM jest w czasie warszawskim, niezależnie od strefy telefonu
const CLOCK = new Intl.DateTimeFormat("pl-PL", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Warsaw",
});

/** Godzina „16:02” w czasie warszawskim. */
export function clockOf(iso: string): string {
  return CLOCK.format(new Date(iso));
}

export type RideStop = { id: string; name: string; at: string; isLast: boolean };

/**
 * Przystanki przejazdu linią wsiadaną na odcinku `legIndex`, po kolei, bez przystanku wsiadania:
 * mijane (`Leg.stops`) i końce odcinków tej samej linii (planer dzieli przejazd między miejscami);
 * ostatni to ten, na którym wysiąść.
 */
export function rideStops(legs: readonly Leg[], legIndex: number): RideStop[] {
  const out: RideStop[] = [];
  for (let i = legIndex; legs[i]; i += 1) {
    const leg = legs[i];
    const prev = legs[i - 1];
    if (
      i > legIndex &&
      (!prev ||
        leg.mode !== prev.mode ||
        leg.line !== prev.line ||
        leg.fromStop.id !== prev.toStop.id)
    ) {
      break;
    }
    for (const stop of leg.stops ?? []) {
      out.push({ id: stop.id, name: stop.name, at: stop.at, isLast: false });
    }
    const arrive = new Date(new Date(leg.departAt).getTime() + leg.durationMin * 60_000);
    out.push({ id: leg.toStop.id, name: leg.toStop.name, at: arrive.toISOString(), isLast: false });
  }
  const last = out[out.length - 1];
  if (last) last.isLast = true;
  return out;
}

/**
 * Kiedy ruszyła jazda (ms), w której zegar jazdy liczy `rideSec`: odejście pierwszego spaceru,
 * a bez niego koniec ostatniego odcinka minus długość trasy.
 */
export function rideStartMs(legs: readonly Leg[], totalMin: number): number {
  const first = legs[0];
  // Spacer, rower i auto ruszają od razu; linia ZTM dopiero po dojściu i czekaniu
  if (first && !isTransitMode(first.mode)) return Date.parse(first.departAt);
  const last = legs[legs.length - 1];
  if (!last) return 0;
  return Date.parse(last.departAt) + (last.durationMin - totalMin) * 60_000;
}

/** Od kiedy do kiedy trwa krok „Dojazdu” od odcinka `legIndex` (cały przejazd linią albo spacer). */
export function stepSpan(
  legs: readonly Leg[],
  legIndex: number,
): { startMs: number; endMs: number } {
  const leg = legs[legIndex];
  if (!leg) return { startMs: 0, endMs: 0 };
  const startMs = Date.parse(leg.departAt);
  if (!isTransitMode(leg.mode)) return { startMs, endMs: startMs + leg.durationMin * 60_000 };
  const stops = rideStops(legs, legIndex);
  const last = stops[stops.length - 1];
  return { startMs, endMs: last ? Date.parse(last.at) : startMs };
}

/**
 * Gdzie jesteśmy na przejeździe linią: ile przystanków z `rideStops` już minęliśmy i kropka
 * między punktami (0 = przystanek wsiadania, i + 1 = i-ty z listy), proporcjonalnie do czasu.
 * Kropki nie ma przed odjazdem i po wysiadce.
 */
export function rideProgress(
  legs: readonly Leg[],
  legIndex: number,
  nowMs: number,
): { passed: number; dot: { from: number; frac: number } | null } {
  const leg = legs[legIndex];
  const stops = rideStops(legs, legIndex);
  if (!leg) return { passed: 0, dot: null };
  const times = [Date.parse(leg.departAt), ...stops.map((stop) => Date.parse(stop.at))];
  const passed = stops.filter((stop) => Date.parse(stop.at) <= nowMs).length;
  if (nowMs < times[0] || nowMs >= times[times.length - 1]) return { passed, dot: null };
  let from = 0;
  while (from + 1 < times.length - 1 && times[from + 1] <= nowMs) from += 1;
  const span = times[from + 1] - times[from];
  return { passed, dot: { from, frac: span > 0 ? (nowMs - times[from]) / span : 0 } };
}

export type DepartureLabel = {
  /** „16:02” z rozkładu albo „ok. 16:05”, gdy planer szacował (połowa częstotliwości). */
  time: string;
  /** Opóźnienie pojazdu na żywo: „+4 min”, „2 min wcześniej”, „na czas”; brak bez danych na żywo. */
  delay: string | null;
  isLate: boolean;
};

/** Godzina odjazdu odcinka komunikacją, jak w #44. `departAt` już uwzględnia `delaySec`. */
export function departureLabel(
  leg: Pick<Leg, "departAt" | "realDeparture" | "delaySec">,
  lang: Lang = "pl",
) {
  const clock = CLOCK.format(new Date(leg.departAt));
  return {
    time: leg.realDeparture ? clock : `${pick(lang, "ok.", "approx.")} ${clock}`,
    delay: delayLabel(leg.delaySec, lang),
    isLate: (leg.delaySec ?? 0) >= 60,
  } satisfies DepartureLabel;
}

function delayLabel(delaySec: number | undefined, lang: Lang): string | null {
  if (delaySec === undefined) return null;
  const min = Math.round(delaySec / 60);
  if (min === 0) return pick(lang, "na czas", "on time");
  return min > 0 ? `+${min} min` : `${-min} ${pick(lang, "min wcześniej", "min early")}`;
}
