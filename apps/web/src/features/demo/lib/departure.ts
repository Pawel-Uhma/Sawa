import type { Leg } from "@sawa/shared";

// Rozkład ZTM jest w czasie warszawskim, niezależnie od strefy telefonu
const CLOCK = new Intl.DateTimeFormat("pl-PL", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Warsaw",
});

export type DepartureLabel = {
  /** „16:02” z rozkładu albo „ok. 16:05”, gdy planer szacował (połowa częstotliwości). */
  time: string;
  /** Opóźnienie pojazdu na żywo: „+4 min”, „2 min wcześniej”, „na czas”; brak bez danych na żywo. */
  delay: string | null;
  isLate: boolean;
};

/** Godzina odjazdu odcinka komunikacją, jak w #44. `departAt` już uwzględnia `delaySec`. */
export function departureLabel(leg: Pick<Leg, "departAt" | "realDeparture" | "delaySec">) {
  const clock = CLOCK.format(new Date(leg.departAt));
  return {
    time: leg.realDeparture ? clock : `ok. ${clock}`,
    delay: delayLabel(leg.delaySec),
    isLate: (leg.delaySec ?? 0) >= 60,
  } satisfies DepartureLabel;
}

function delayLabel(delaySec: number | undefined): string | null {
  if (delaySec === undefined) return null;
  const min = Math.round(delaySec / 60);
  if (min === 0) return "na czas";
  return min > 0 ? `+${min} min` : `${-min} min wcześniej`;
}
