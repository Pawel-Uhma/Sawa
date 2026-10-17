"use client";

import type { Leg } from "@sawa/shared";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { haptic, SPRING } from "../lib/device";
import { formatDuration } from "../lib/format";
import { type MockStop, stopLineLabel } from "../lib/mock-data";
import { ChevronLeftIcon, PauseIcon, PinIcon, PlayIcon, SkipNextIcon, SkipPrevIcon } from "./icons";
import { Journey, LineBadge } from "./line-badge";
import { SawaMenuButton } from "./sawa-menu";

/** Trzy propozycje ekranu gotowej trasy. Wybór w `?trasa=a|b|c`, do czasu decyzji zespołu. */
export const ROUTE_VARIANTS = ["a", "b", "c"] as const;
export type RouteVariant = (typeof ROUTE_VARIANTS)[number];

export const ROUTE_VARIANT_LABELS: Record<RouteVariant, string> = {
  a: "Odtwarzacz",
  b: "Rozkład",
  c: "Pocztówki",
};

export type RouteViewProps = {
  durationMin: number;
  end: { label: string; reached: boolean } | null;
  legs: Leg[];
  stops: MockStop[];
  activeIndex: number;
  onBack: () => void;
  isDesktop: boolean;
  isPlaying: boolean;
  progress: number;
  storyText: string | null;
  storyState: "loading" | "ready" | "failed";
  direction: number;
  goTo: (index: number) => void;
  togglePlay: () => void;
};

function storyCopy(state: RouteViewProps["storyState"], text: string | null) {
  if (state === "loading") return "Sawa przypomina sobie, co wie o tym miejscu…";
  if (state === "failed") return "Tym razem Sawa nic nie powie. Jedziemy dalej.";
  return text ?? "";
}

function stopKind(stop: MockStop) {
  return stop.mode === "walk" ? "Opowieść po drodze" : "Opowieść z okna";
}

const CLOCK = new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit" });

function clock(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : CLOCK.format(date);
}

/* ------------------------------------------------------------------ */
/* Wspólne klocki                                                      */
/* ------------------------------------------------------------------ */

function BackButton({ onBack, compact }: { onBack: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onBack}
      aria-label={compact ? "Zmień plan" : undefined}
      className={`flex h-10 shrink-0 items-center gap-1 rounded-full bg-tlo-2 text-sm font-bold text-tekst transition-[transform,background-color] hover:bg-mieta-jasna active:scale-[0.96] ${
        compact ? "w-10 justify-center" : "pl-2.5 pr-3.5"
      }`}
    >
      <ChevronLeftIcon className="size-4" />
      {!compact && "Zmień plan"}
    </button>
  );
}

function EndPill({ end }: { end: RouteViewProps["end"] }) {
  if (!end) return null;
  return (
    <p
      role={end.reached ? undefined : "status"}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold ${
        end.reached ? "bg-mieta-jasna text-glebia" : "bg-koral/15 text-tekst"
      }`}
    >
      <PinIcon className="size-4 shrink-0" />
      {end.label}
    </p>
  );
}

function PlayButton({
  isPlaying,
  onToggle,
  size = "lg",
}: {
  isPlaying: boolean;
  onToggle: () => void;
  size?: "lg" | "sm";
}) {
  const big = size === "lg";
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      aria-label={isPlaying ? "Pauza" : "Odtwarzaj"}
      whileTap={{ scale: 0.92 }}
      transition={SPRING}
      className={`flex shrink-0 items-center justify-center rounded-full bg-glebia text-white transition-colors hover:bg-glebia-ciemna ${
        big ? "size-16 shadow-[0_6px_16px_rgba(23,112,111,0.3)]" : "size-10"
      }`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={isPlaying ? "pause" : "play"}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: "spring", bounce: 0, duration: 0.25 }}
        >
          {isPlaying ? (
            <PauseIcon className={big ? "size-7" : "size-5"} />
          ) : (
            <PlayIcon className={`${big ? "size-7" : "size-5"} translate-x-[1px]`} />
          )}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

function SkipButton({
  dir,
  disabled,
  onClick,
}: {
  dir: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = dir === "prev" ? SkipPrevIcon : SkipNextIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "Poprzednia opowieść" : "Następna opowieść"}
      className="flex size-12 items-center justify-center rounded-full text-tekst transition-[transform,opacity,background-color] hover:bg-tlo-2 active:scale-[0.92] disabled:opacity-30"
    >
      <Icon className="size-6" />
    </button>
  );
}

/** Pasek postępu jak w relacjach: jeden odcinek na punkt, bieżący napełnia się z opowieścią. */
function Segments({
  total,
  activeIndex,
  progress,
}: {
  total: number;
  activeIndex: number;
  progress: number;
}) {
  return (
    <div
      role="progressbar"
      aria-label="Postęp przejażdżki"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={activeIndex + progress / 100}
      className="flex gap-1"
    >
      {Array.from({ length: total }, (_, index) => {
        const fill = index < activeIndex ? 1 : index === activeIndex ? progress / 100 : 0;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: odcinki nie mają innej tożsamości niż pozycja
          <span key={index} className="h-1 flex-1 overflow-hidden rounded-full bg-tekst/10">
            <span
              className="block h-full origin-left rounded-full bg-glebia"
              style={{ transform: `scaleX(${fill})` }}
            />
          </span>
        );
      })}
    </div>
  );
}

/** Przewija poziomą listę tak, żeby aktywny element był w polu widzenia. */
function useScrollActiveIntoView(
  listRef: React.RefObject<HTMLElement | null>,
  activeIndex: number,
  align: "center" | "start" = "center",
) {
  const reduce = useReducedMotion();
  useEffect(() => {
    const list = listRef.current;
    const item = list?.children[activeIndex] as HTMLElement | undefined;
    if (!list || !item) return;
    const left =
      align === "center"
        ? item.offsetLeft - (list.clientWidth - item.clientWidth) / 2
        : item.offsetLeft - Number.parseFloat(getComputedStyle(list).paddingLeft || "0");
    list.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
  }, [activeIndex, listRef, align, reduce]);
}

/* ------------------------------------------------------------------ */
/* A. Odtwarzacz: opowieść jest bohaterem, jak „Teraz odtwarzane”      */
/* ------------------------------------------------------------------ */

export function RouteViewPlayer({
  durationMin,
  end,
  legs,
  stops,
  activeIndex,
  onBack,
  isDesktop,
  isPlaying,
  progress,
  storyText,
  storyState,
  direction,
  goTo,
  togglePlay,
}: RouteViewProps) {
  const stop = stops[activeIndex];
  const reduce = useReducedMotion();
  const stripRef = useRef<HTMLOListElement>(null);
  useScrollActiveIntoView(stripRef, activeIndex);
  if (!stop) return null;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center gap-3">
        <BackButton onBack={onBack} compact />
        <div className="min-w-0 flex-1">
          <p className="etykieta">Twoja przejażdżka</p>
          <p className="flex flex-wrap items-center gap-1.5 text-sm text-tekst-2">
            <span className="font-semibold text-tekst">{formatDuration(durationMin)}</span>
            <Journey legs={legs} />
          </p>
        </div>
        {isDesktop && <SawaMenuButton variant="inline" />}
      </header>

      <Segments total={stops.length} activeIndex={activeIndex} progress={progress} />

      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.article
          key={stop.id}
          custom={direction}
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: direction * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: direction * -40 }}
          transition={SPRING}
          aria-label={`Opowieść ${activeIndex + 1} z ${stops.length}: ${stop.name}`}
        >
          <p className="etykieta flex items-center gap-2">
            <span className="tabular-nums">
              {activeIndex + 1} / {stops.length}
            </span>
            <span aria-hidden="true">·</span>
            {stopKind(stop)}
          </p>
          <h2 className="mt-1.5 text-[28px] font-extrabold leading-[1.08] tracking-[-0.025em] md:text-[30px]">
            {stop.name}
          </h2>
          <p className="mt-2 flex items-center gap-2 text-sm text-tekst-3">
            <LineBadge line={stop.line} mode={stop.mode ?? "tram"} />
            po ok. {stop.etaMin} min
          </p>
          <p
            aria-live="polite"
            className={`mt-4 min-h-[5.5em] text-[17px] leading-[1.55] text-tekst-2 ${
              storyState === "loading" ? "animate-pulse opacity-60" : ""
            }`}
          >
            {storyCopy(storyState, storyText)}
          </p>
        </motion.article>
      </AnimatePresence>

      <div className="flex items-center justify-center gap-6">
        <SkipButton dir="prev" disabled={activeIndex === 0} onClick={() => goTo(activeIndex - 1)} />
        <PlayButton isPlaying={isPlaying} onToggle={togglePlay} />
        <SkipButton
          dir="next"
          disabled={activeIndex >= stops.length - 1}
          onClick={() => goTo(activeIndex + 1)}
        />
      </div>

      <section aria-label="Punkty trasy" className="-mx-4 md:-mx-6">
        <div className="mb-2 flex items-center justify-between px-4 md:px-6">
          <p className="etykieta">Po drodze</p>
          <EndPill end={end} />
        </div>
        <ol
          ref={stripRef}
          className="flex touch-pan-x snap-x gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none] md:px-6"
        >
          {stops.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <li key={item.id} className="snap-center">
                <button
                  type="button"
                  aria-current={isActive ? "step" : undefined}
                  onClick={() => goTo(index)}
                  className="relative flex h-11 max-w-[220px] items-center gap-2 rounded-full bg-tlo-2 pl-1.5 pr-3.5 text-left transition-transform active:scale-[0.96]"
                >
                  {isActive && (
                    <motion.span
                      layoutId="trasa-a-aktywny"
                      transition={SPRING}
                      className="absolute inset-0 rounded-full bg-glebia"
                    />
                  )}
                  <span
                    className={`relative flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold ${
                      isActive
                        ? "bg-white text-glebia"
                        : index < activeIndex
                          ? "bg-mieta text-glebia-ciemna"
                          : "bg-koral text-white"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={`relative truncate text-sm font-bold ${isActive ? "text-white" : ""}`}
                  >
                    {item.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* B. Rozkład: cała jazda jak plan podróży, opowieść rozwija się w nim */
/* ------------------------------------------------------------------ */

type ItineraryRow =
  | { kind: "leg"; leg: Leg; startMin: number }
  | { kind: "stop"; stop: MockStop; index: number };

/** Odcinki i punkty w kolejności jazdy: punkt ląduje pod odcinkiem, w którego czasie wypada. */
function buildItinerary(legs: Leg[], stops: MockStop[]): ItineraryRow[] {
  // Kolejne odcinki tej samej linii łączymy w jeden (jak `journeyLegs`), sumując czas
  const runs: { leg: Leg; startMin: number }[] = [];
  let cursor = 0;
  for (const leg of legs) {
    const last = runs[runs.length - 1];
    if (!last || last.leg.mode !== leg.mode || last.leg.line !== leg.line) {
      runs.push({ leg, startMin: cursor });
    }
    cursor += leg.durationMin;
  }

  const rows: ItineraryRow[] = [];
  let stopIndex = 0;
  runs.forEach((run, runIndex) => {
    rows.push({ kind: "leg", ...run });
    const nextStart = runs[runIndex + 1]?.startMin ?? Number.POSITIVE_INFINITY;
    while (stopIndex < stops.length && stops[stopIndex].etaMin < nextStart) {
      rows.push({ kind: "stop", stop: stops[stopIndex], index: stopIndex });
      stopIndex++;
    }
  });
  for (; stopIndex < stops.length; stopIndex++) {
    rows.push({ kind: "stop", stop: stops[stopIndex], index: stopIndex });
  }
  return rows;
}

export function RouteViewItinerary({
  durationMin,
  end,
  legs,
  stops,
  activeIndex,
  onBack,
  isDesktop,
  isPlaying,
  progress,
  storyText,
  storyState,
  goTo,
  togglePlay,
}: RouteViewProps) {
  const reduce = useReducedMotion();
  const rows = buildItinerary(legs, stops);
  const departAt = legs[0]?.departAt;

  return (
    <div className="flex flex-col gap-5">
      <header>
        {isDesktop && (
          <div className="mb-4">
            <SawaMenuButton variant="inline" />
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="etykieta">Twoja przejażdżka</p>
            <h2 className="mt-0.5 text-[34px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">
              {formatDuration(durationMin)}
            </h2>
          </div>
          <BackButton onBack={onBack} />
        </div>
        <p className="mt-2 text-sm text-tekst-2">
          {departAt && clock(departAt) ? (
            <>
              Start <span className="font-semibold text-tekst">{clock(departAt)}</span> ·{" "}
            </>
          ) : null}
          {stops.length} opowieści po drodze
        </p>
        {end && (
          <div className="mt-2">
            <EndPill end={end} />
          </div>
        )}
      </header>

      <ol aria-label="Plan przejażdżki" className="relative">
        {rows.map((row) => {
          if (row.kind === "leg") {
            const { leg } = row;
            const time = clock(leg.departAt);
            return (
              <li
                key={`leg-${leg.mode}-${leg.line}-${leg.departAt}`}
                className="relative flex items-center gap-3 py-2 pl-[46px]"
              >
                <span
                  aria-hidden="true"
                  className={`absolute bottom-0 left-[21px] top-0 w-1 rounded-full ${
                    leg.mode === "walk"
                      ? "bg-[repeating-linear-gradient(to_bottom,#8a9c9a_0_4px,transparent_4px_8px)] opacity-60"
                      : leg.mode === "tram"
                        ? "bg-[#C8102E]/80"
                        : "bg-[#1F2A44]/80"
                  }`}
                />
                <LineBadge line={leg.line} mode={leg.mode} />
                <span className="min-w-0 flex-1 truncate text-[13px] text-tekst-2">
                  {leg.mode === "walk" ? "Spacer" : `kier. ${leg.headsign}`}
                  {leg.fromStop?.name && leg.mode !== "walk" && (
                    <span className="text-tekst-3"> · z {leg.fromStop.name}</span>
                  )}
                </span>
                {time && (
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-tekst-3">
                    {time}
                  </span>
                )}
              </li>
            );
          }

          const { stop, index } = row;
          const isActive = index === activeIndex;
          const isDone = index < activeIndex;
          return (
            <li key={stop.id} className="relative">
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-[21px] top-0 w-1 rounded-full bg-tekst/10"
              />
              <motion.div
                layout={!reduce}
                transition={SPRING}
                className={`relative rounded-[22px] ${
                  isActive
                    ? "bg-white shadow-[0_1px_2px_rgba(16,43,42,0.06),0_10px_30px_rgba(16,43,42,0.10)]"
                    : ""
                }`}
              >
                <button
                  type="button"
                  aria-current={isActive ? "step" : undefined}
                  aria-expanded={isActive}
                  onClick={() => goTo(index)}
                  className="flex w-full items-center gap-3 rounded-[22px] py-2.5 pl-2 pr-3 text-left transition-colors active:bg-tlo-2"
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-white text-[13px] font-extrabold transition-colors duration-300 ${
                      isActive
                        ? "bg-glebia text-white"
                        : isDone
                          ? "bg-mieta text-glebia-ciemna"
                          : "bg-koral text-white"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate font-bold ${isActive ? "text-[17px]" : "text-[15px]"}`}
                    >
                      {stop.name}
                    </span>
                    <span className="block text-xs text-tekst-3">
                      {stopKind(stop)} · {stopLineLabel(stop)}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-tekst-3">
                    +{stop.etaMin} min
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isActive && (
                    <motion.div
                      key="story"
                      initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                      animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                      transition={SPRING}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pl-[52px]">
                        <p
                          aria-live="polite"
                          className={`text-[15px] leading-relaxed text-tekst-2 ${
                            storyState === "loading" ? "animate-pulse opacity-60" : ""
                          }`}
                        >
                          {storyCopy(storyState, storyText)}
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                          <PlayButton isPlaying={isPlaying} onToggle={togglePlay} size="sm" />
                          <div
                            role="progressbar"
                            aria-label="Postęp opowieści"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(progress)}
                            className="h-1.5 flex-1 overflow-hidden rounded-full bg-tlo-2"
                          >
                            <div
                              className="h-full origin-left rounded-full bg-glebia"
                              style={{ transform: `scaleX(${progress / 100})` }}
                            />
                          </div>
                          {index < stops.length - 1 && (
                            <button
                              type="button"
                              onClick={() => goTo(index + 1)}
                              aria-label="Następna opowieść"
                              className="flex size-10 items-center justify-center rounded-full text-tekst transition-[transform,background-color] hover:bg-tlo-2 active:scale-[0.92]"
                            >
                              <SkipNextIcon className="size-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* C. Pocztówki: każdy punkt to duża karta, przewijana palcem w bok    */
/* ------------------------------------------------------------------ */

export function RouteViewPostcards({
  durationMin,
  end,
  legs,
  stops,
  activeIndex,
  onBack,
  isDesktop,
  isPlaying,
  progress,
  storyText,
  storyState,
  goTo,
  togglePlay,
}: RouteViewProps) {
  const railRef = useRef<HTMLOListElement>(null);
  // Przewijanie wywołane przez nas (zmiana punktu z zewnątrz) nie może z powrotem wybierać punktu
  const programmatic = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const activeRef = useRef(activeIndex);
  activeRef.current = activeIndex;
  const goToRef = useRef(goTo);
  goToRef.current = goTo;
  const reduce = useReducedMotion();

  // Punkt zmienił się z zewnątrz (koniec opowieści, mapa, klawiatura): dosuwamy kartę
  useEffect(() => {
    const rail = railRef.current;
    const card = rail?.children[activeIndex] as HTMLElement | undefined;
    if (!rail || !card) return;
    const left = card.offsetLeft - (rail.clientWidth - card.clientWidth) / 2;
    if (Math.abs(rail.scrollLeft - left) < 2) return;
    programmatic.current = true;
    rail.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
  }, [activeIndex, reduce]);

  function onScroll() {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const rail = railRef.current;
      if (!rail) return;
      if (programmatic.current) {
        programmatic.current = false;
        return;
      }
      const center = rail.scrollLeft + rail.clientWidth / 2;
      let nearest = 0;
      let best = Number.POSITIVE_INFINITY;
      Array.from(rail.children).forEach((child, index) => {
        const el = child as HTMLElement;
        const distance = Math.abs(el.offsetLeft + el.clientWidth / 2 - center);
        if (distance < best) {
          best = distance;
          nearest = index;
        }
      });
      if (nearest !== activeRef.current) {
        haptic();
        goToRef.current(nearest);
      }
    }, 110);
  }

  const next = stops[activeIndex + 1];

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">
            {formatDuration(durationMin)} z Sawą
          </h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-tekst-2">
            <Journey legs={legs} />
          </p>
        </div>
        {isDesktop ? <SawaMenuButton variant="inline" /> : null}
        <BackButton onBack={onBack} compact />
      </header>

      <ol
        ref={railRef}
        onScroll={onScroll}
        aria-label="Opowieści na trasie"
        className="-mx-4 flex touch-pan-x snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-[7%] py-2 [scrollbar-width:none] md:-mx-6"
      >
        {stops.map((stop, index) => {
          const isActive = index === activeIndex;
          return (
            <li
              key={stop.id}
              aria-current={isActive ? "step" : undefined}
              className="w-[86%] shrink-0 snap-center snap-always"
            >
              <motion.article
                animate={{ scale: isActive ? 1 : 0.94, opacity: isActive ? 1 : 0.55 }}
                transition={SPRING}
                aria-label={`Opowieść ${index + 1} z ${stops.length}: ${stop.name}`}
                className="relative flex h-full min-h-[300px] flex-col overflow-hidden rounded-[28px] bg-white p-5 shadow-[0_1px_2px_rgba(16,43,42,0.06),0_14px_34px_rgba(16,43,42,0.12)]"
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute -right-3 -top-8 text-[140px] font-extrabold leading-none tracking-[-0.06em] ${
                    index < activeIndex ? "text-mieta/40" : "text-koral/15"
                  }`}
                >
                  {index + 1}
                </span>
                <p className="etykieta relative">{stopKind(stop)}</p>
                <h3 className="relative mt-1 pr-10 text-[24px] font-extrabold leading-[1.1] tracking-[-0.02em]">
                  {stop.name}
                </h3>
                <p className="relative mt-2 flex items-center gap-2 text-[13px] text-tekst-3">
                  <LineBadge line={stop.line} mode={stop.mode ?? "tram"} />
                  po ok. {stop.etaMin} min
                </p>

                <p
                  aria-live={isActive ? "polite" : undefined}
                  className={`relative mt-4 line-clamp-6 flex-1 text-[15px] leading-relaxed text-tekst-2 ${
                    isActive && storyState === "loading" ? "animate-pulse opacity-60" : ""
                  }`}
                >
                  {isActive
                    ? storyCopy(storyState, storyText)
                    : index < activeIndex
                      ? "Już opowiedziane. Przesuń, żeby posłuchać jeszcze raz."
                      : "Sawa opowie, kiedy tu dojedziesz."}
                </p>

                <div className="relative mt-4 flex items-center gap-3">
                  {isActive ? (
                    <PlayButton isPlaying={isPlaying} onToggle={togglePlay} size="sm" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => goTo(index)}
                      className="h-10 rounded-full bg-tlo-2 px-4 text-sm font-bold text-tekst transition-transform active:scale-[0.96]"
                    >
                      Posłuchaj
                    </button>
                  )}
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-tlo-2">
                    <div
                      className="h-full origin-left rounded-full bg-glebia"
                      style={{
                        transform: `scaleX(${isActive ? progress / 100 : index < activeIndex ? 1 : 0})`,
                      }}
                    />
                  </div>
                </div>
              </motion.article>
            </li>
          );
        })}
      </ol>

      <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
        {stops.map((stop, index) => (
          <motion.span
            key={stop.id}
            animate={{ width: index === activeIndex ? 18 : 6 }}
            transition={SPRING}
            className={`h-1.5 rounded-full ${index === activeIndex ? "bg-glebia" : "bg-tekst/15"}`}
          />
        ))}
      </div>

      <div className="flex flex-col items-start gap-2">
        {next ? (
          <p className="text-sm text-tekst-2">
            Dalej: <span className="font-bold text-tekst">{next.name}</span> · po ok. {next.etaMin}{" "}
            min
          </p>
        ) : (
          <p className="text-sm text-tekst-2">To ostatnia opowieść na tej trasie.</p>
        )}
        <EndPill end={end} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Przełącznik propozycji                                              */
/* ------------------------------------------------------------------ */

export function RouteVariantSwitch({
  value,
  onChange,
}: {
  value: RouteVariant;
  onChange: (variant: RouteVariant) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Propozycja ekranu trasy"
      className="flex rounded-full bg-tlo-2 p-0.5 text-xs font-bold"
    >
      {ROUTE_VARIANTS.map((variant) => {
        const isOn = variant === value;
        return (
          // biome-ignore lint/a11y/useSemanticElements: segmentowy przełącznik jak w iOS, nie lista radio
          <button
            key={variant}
            type="button"
            role="radio"
            aria-checked={isOn}
            onClick={() => {
              haptic();
              onChange(variant);
            }}
            className="relative flex-1 rounded-full px-3 py-1.5"
          >
            {isOn && (
              <motion.span
                layoutId="trasa-wariant"
                transition={SPRING}
                className="absolute inset-0 rounded-full bg-white shadow-[0_1px_3px_rgba(16,43,42,0.15)]"
              />
            )}
            <span className="relative">
              {variant.toUpperCase()} · {ROUTE_VARIANT_LABELS[variant]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
