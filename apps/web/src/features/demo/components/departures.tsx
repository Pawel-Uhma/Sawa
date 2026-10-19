import type { Leg } from "@sawa/shared";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useLang, useT } from "@/features/i18n";
import { clockOf, departureLabel, rideStops } from "../lib/departure";
import { SPRING } from "../lib/device";
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
  /**
   * Stuknięcie odcinka (linii albo spaceru) podświetla go na mapie, linia rozwija też swoje
   * przystanki; drugie stuknięcie zwija i gasi.
   */
  onSelectLeg?: (legIndex: number | null) => void;
}) {
  const lang = useLang();
  const t = useT();
  // Rozwinięta linia: przystanki po kolei, ostatni to ten, na którym wysiąść
  const [expanded, setExpanded] = useState<number | null>(null);
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
          const isOpen = !walk && expanded === legIndex;
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
                // Opóźnienie pod godziną, żeby nie ściskało nazwy przystanku
                <span className="flex shrink-0 flex-col items-end tabular-nums">
                  <span className="font-semibold text-tekst">{time}</span>
                  {delay && (
                    <span
                      className={`text-[11.5px] font-semibold ${isLate ? "text-koral" : "text-glebia"}`}
                    >
                      {delay}
                    </span>
                  )}
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
                  aria-expanded={walk ? undefined : isOpen}
                  onClick={() => {
                    const isPicked = walk ? isSelected : isOpen;
                    setExpanded(isPicked || walk ? null : legIndex);
                    onSelectLeg(isPicked ? null : legIndex);
                  }}
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
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="stops"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={SPRING}
                    className="overflow-hidden"
                  >
                    <RideStops legs={legs} legIndex={legIndex} color={accent} />
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Przystanki rozwiniętej linii: kreska w jej kolorze, kropki, godziny; wysiadka wyróżniona. */
function RideStops({
  legs,
  legIndex,
  color,
}: {
  legs: readonly Leg[];
  legIndex: number;
  color: string;
}) {
  const t = useT();
  const stops = rideStops(legs, legIndex);
  return (
    <ol
      aria-label={t("Przystanki po drodze", "Stops on the way")}
      className="relative ml-[22px] mt-0.5 mb-1.5 border-l-2 pl-3"
      style={{ borderColor: color }}
    >
      {stops.map((stop) => (
        <li
          key={`${stop.id}-${stop.at}`}
          className="relative flex items-baseline gap-2 py-[3px] text-[12.5px]"
        >
          <span
            aria-hidden
            className={`absolute top-1/2 -translate-y-1/2 rounded-full ${
              stop.isLast ? "-left-[19px] size-3 ring-2 ring-tlo-2" : "-left-[16.5px] size-[7px]"
            }`}
            style={{ backgroundColor: color }}
          />
          <span
            className={`min-w-0 flex-1 truncate ${stop.isLast ? "font-bold text-tekst" : "text-tekst-2"}`}
          >
            {stop.name}
            {stop.isLast && (
              <span className="ml-1.5 text-[11px] font-semibold text-tekst-3">
                {t("wysiądź", "get off")}
              </span>
            )}
          </span>
          <span className="shrink-0 tabular-nums text-tekst-3">{clockOf(stop.at)}</span>
        </li>
      ))}
    </ol>
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
