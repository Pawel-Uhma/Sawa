import type { Leg } from "@sawa/shared";
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
