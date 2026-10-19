import type { Leg } from "@sawa/shared";
import { useLang, useT } from "@/features/i18n";
import { departureLabel } from "../lib/departure";
import { journeyLegs, LineBadge, legColors, rideEnd } from "./line-badge";

/**
 * Dojazd jako jedna lista odcinków: każda linia pada raz, z przystankiem i godziną odjazdu
 * (z rozkładu albo „ok.”, przy pierwszym opóźnienie na żywo, #44). Pieszo ma minuty i cel zamiast godziny.
 */
export function Itinerary({
  legs,
  duration,
  selectedLegs = null,
  onSelectLeg,
}: {
  legs: readonly Leg[];
  duration: string;
  /** Odcinki podświetlone na mapie (`highlightedLegs`). */
  selectedLegs?: readonly number[] | null;
  /** Stuknięcie odcinka (linii albo spaceru) podświetla go na mapie, drugie stuknięcie gasi. */
  onSelectLeg?: (legIndex: number | null) => void;
}) {
  const lang = useLang();
  const t = useT();
  const steps = journeyLegs(legs);
  const colors = legColors(legs);
  if (steps.length === 0) return null;

  return (
    <section aria-label={t("Dojazd", "Getting there")} className="rounded-2xl bg-tlo-2 px-3.5 py-3">
      <div className="mb-2.5 flex items-baseline justify-between">
        <h3 className="etykieta">{t("Dojazd", "Getting there")}</h3>
        <span className="text-[13px] font-bold tabular-nums text-tekst">{duration}</span>
      </div>
      <ol className="-mx-1.5 flex flex-col gap-0.5 text-[13px]">
        {steps.map((leg) => {
          const walk = leg.mode === "walk";
          const { time, delay, isLate } = departureLabel(leg, lang);
          const line = colors.get(leg);
          const legIndex = legs.indexOf(leg);
          const end = rideEnd(legs, legIndex);
          const isSelected = selectedLegs?.includes(legIndex) ?? false;
          const accent = line?.color ?? "var(--color-tekst-3)";
          const row = (
            <>
              <LineBadge line={leg.line} mode={leg.mode} color={line?.color} />
              {walk ? (
                <span className="min-w-0 flex-1 truncate text-left text-tekst-2">
                  {`${Math.max(1, Math.round(leg.durationMin))} min · ${leg.headsign || leg.toStop.name}`}
                </span>
              ) : (
                <span className="flex min-w-0 flex-1 flex-col text-left">
                  <span className="truncate text-tekst-2">{leg.fromStop.name}</span>
                  {/* Gdzie wysiąść, widać od razu, bez rozwijania */}
                  <span className="truncate text-[12px] text-tekst-3">
                    {t(
                      `wysiądź: ${end.stop} · ${Math.max(1, Math.round(end.min))} min`,
                      `get off: ${end.stop} · ${Math.max(1, Math.round(end.min))} min`,
                    )}
                  </span>
                </span>
              )}
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
            </>
          );
          return (
            <li key={`${leg.mode}-${leg.line}-${leg.departAt}`}>
              {onSelectLeg ? (
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectLeg(isSelected ? null : legIndex)}
                  className={`flex w-full min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-tekst/[0.05] ${
                    isSelected ? "bg-tekst/[0.08]" : ""
                  }`}
                  style={isSelected ? { boxShadow: `inset 3px 0 0 ${accent}` } : undefined}
                >
                  {row}
                </button>
              ) : (
                <div className="flex min-w-0 items-center gap-2 px-1.5 py-1">{row}</div>
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
