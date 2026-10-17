import type { Leg } from "@sawa/shared";
import { departureLabel } from "../lib/departure";
import { LineBadge } from "./line-badge";

/**
 * Odjazdy kolejnych przejazdów: godzina z rozkładu albo „ok.”, przy pierwszym opóźnienie na żywo (#44).
 * Odcinki pieszo nie mają godziny, więc ich tu nie ma.
 */
export function Departures({ legs }: { legs: readonly Leg[] }) {
  const rides = legs.filter((leg) => leg.mode !== "walk");
  if (rides.length === 0) return null;

  return (
    <ul aria-label="Odjazdy" className="flex flex-col gap-1.5 text-[13px]">
      {rides.map((leg) => {
        const { time, delay, isLate } = departureLabel(leg);
        return (
          <li key={`${leg.line}-${leg.departAt}`} className="flex min-w-0 items-center gap-2">
            <LineBadge line={leg.line} mode={leg.mode} />
            <span className="min-w-0 flex-1 truncate text-tekst-2">{leg.fromStop.name}</span>
            <span className="shrink-0 font-semibold tabular-nums text-tekst">{time}</span>
            {delay && (
              <span
                className={`shrink-0 font-semibold tabular-nums ${isLate ? "text-koral" : "text-glebia"}`}
              >
                {delay}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Podpis źródeł danych przy trasie: wymóg licencji CC BY (ZTM, dane.um.warszawa.pl). */
export function Attribution({ lines }: { lines: readonly string[] }) {
  if (lines.length === 0) return null;
  return (
    <footer className="text-[11px] leading-snug text-tekst-3">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </footer>
  );
}
