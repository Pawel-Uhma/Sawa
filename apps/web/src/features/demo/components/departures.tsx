import type { Leg } from "@sawa/shared";
import { useLang, useT } from "@/features/i18n";
import { departureLabel } from "../lib/departure";
import { journeyLegs, LineBadge } from "./line-badge";

/**
 * Dojazd jako jedna lista odcinków: każda linia pada raz, z przystankiem i godziną odjazdu
 * (z rozkładu albo „ok.”, przy pierwszym opóźnienie na żywo, #44). Pieszo ma minuty i cel zamiast godziny.
 */
export function Itinerary({ legs, duration }: { legs: readonly Leg[]; duration: string }) {
  const lang = useLang();
  const t = useT();
  const steps = journeyLegs(legs);
  if (steps.length === 0) return null;

  return (
    <section aria-label={t("Dojazd", "Getting there")} className="rounded-2xl bg-tlo-2 px-3.5 py-3">
      <div className="mb-2.5 flex items-baseline justify-between">
        <h3 className="etykieta">{t("Dojazd", "Getting there")}</h3>
        <span className="text-[13px] font-bold tabular-nums text-tekst">{duration}</span>
      </div>
      <ol className="flex flex-col gap-2 text-[13px]">
        {steps.map((leg) => {
          const walk = leg.mode === "walk";
          const { time, delay, isLate } = departureLabel(leg, lang);
          return (
            <li
              key={`${leg.mode}-${leg.line}-${leg.departAt}`}
              className="flex min-w-0 items-center gap-2"
            >
              <LineBadge line={leg.line} mode={leg.mode} />
              <span className="min-w-0 flex-1 truncate text-tekst-2">
                {walk
                  ? `${Math.max(1, Math.round(leg.durationMin))} min · ${leg.headsign || leg.toStop.name}`
                  : leg.fromStop.name}
              </span>
              {!walk && (
                <span className="shrink-0 font-semibold tabular-nums text-tekst">{time}</span>
              )}
              {!walk && delay && (
                <span
                  className={`shrink-0 font-semibold tabular-nums ${isLate ? "text-koral" : "text-glebia"}`}
                >
                  {delay}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
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
