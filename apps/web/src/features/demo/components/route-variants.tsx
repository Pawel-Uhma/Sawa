"use client";

import type { Leg } from "@sawa/shared";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type Ref, useEffect, useRef, useState } from "react";
import { haptic, SPRING } from "../lib/device";
import { formatDuration } from "../lib/format";
import { type MockStop, stopLineLabel } from "../lib/mock-data";
import { ChevronLeftIcon, PauseIcon, PinIcon, PlayIcon } from "./icons";
import { Journey, LineBadge } from "./line-badge";
import { SawaMenuButton } from "./sawa-menu";

/**
 * Trzy propozycje ekranu gotowej trasy. Wybór w `?trasa=a|b|c`, do czasu decyzji zespołu.
 *
 * Założenie (T-106): to, o czym Sawa mówi, wybiera lokalizacja, a nie użytkownik. Sawa opowiada
 * jednym ciągłym strumieniem i sama przechodzi od tematu do tematu, więc ekran nie ma przycisków
 * „poprzednia/następna”. Jest pauza, a skok do przodu („Opowiedz teraz”) to wyjątek, nie nawigacja.
 */
export const ROUTE_VARIANTS = ["a", "b", "c"] as const;
export type RouteVariant = (typeof ROUTE_VARIANTS)[number];

export const ROUTE_VARIANT_LABELS: Record<RouteVariant, string> = {
  a: "Na żywo",
  b: "Rozkład",
  c: "Rozdziały",
};

/** Fragment strumienia Sawy przypisany do punktu trasy (temat, o którym wtedy mówiła). */
export type TranscriptPart = { stopIndex: number; text: string };

export type RouteViewProps = {
  durationMin: number;
  end: { label: string; reached: boolean } | null;
  legs: Leg[];
  stops: MockStop[];
  /** Punkt, przy którym jest użytkownik i o którym Sawa teraz mówi. */
  activeIndex: number;
  onBack: () => void;
  isDesktop: boolean;
  isPlaying: boolean;
  /** Ile bieżącego tematu już padło (0–100). */
  progress: number;
  storyText: string | null;
  storyState: "loading" | "ready" | "failed";
  /** Całe dotychczasowe opowiadanie, ostatni fragment jest na żywo. */
  transcript: TranscriptPart[];
  goTo: (index: number) => void;
  togglePlay: () => void;
};

const CLOCK = new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit" });

function clock(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : CLOCK.format(date);
}

/** Za ile następny temat. Dziś z `etaMin`, po T-106 z odległości do punktu. */
function untilNext(stops: MockStop[], activeIndex: number) {
  const now = stops[activeIndex];
  const next = stops[activeIndex + 1];
  if (!now || !next) return null;
  const min = Math.max(1, next.etaMin - now.etaMin);
  return { stop: next, label: `za ok. ${min} min` };
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

/** Pulsująca kropka „na żywo”; przy pauzie stoi i szarzeje. */
function LiveDot({ on }: { on: boolean }) {
  const reduce = useReducedMotion();
  return (
    <span className="relative flex size-2.5 shrink-0">
      {on && !reduce && (
        <motion.span
          className="absolute inset-0 rounded-full bg-koral"
          animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
          transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "easeOut" }}
        />
      )}
      <span
        className={`relative size-2.5 rounded-full transition-colors ${on ? "bg-koral" : "bg-tekst-3"}`}
      />
    </span>
  );
}

function PlayButton({
  isPlaying,
  onToggle,
  size = "md",
}: {
  isPlaying: boolean;
  onToggle: () => void;
  size?: "lg" | "md";
}) {
  const big = size === "lg";
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      aria-label={isPlaying ? "Wstrzymaj Sawę" : "Wznów Sawę"}
      whileTap={{ scale: 0.92 }}
      transition={SPRING}
      className={`flex shrink-0 items-center justify-center rounded-full bg-glebia text-white transition-colors hover:bg-glebia-ciemna ${
        big ? "size-14 shadow-[0_6px_16px_rgba(23,112,111,0.3)]" : "size-11"
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
            <PauseIcon className={big ? "size-6" : "size-5"} />
          ) : (
            <PlayIcon className={`${big ? "size-6" : "size-5"} translate-x-[1px]`} />
          )}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

/**
 * Tekst na żywo: wypowiedziane słowa pełnym kolorem, reszta jaśniej (jak napisy karaoke).
 * Przy strumieniu tekst rośnie, a granica idzie za głosem.
 */
function LiveText({
  text,
  progress,
  state,
  className = "",
  edgeRef,
}: {
  text: string | null;
  progress: number;
  state: RouteViewProps["storyState"];
  className?: string;
  /** Znacznik w miejscu, do którego doszedł głos (do przewijania za nim). */
  edgeRef?: Ref<HTMLSpanElement>;
}) {
  if (state === "loading" || !text) {
    return (
      <p className={`animate-pulse text-tekst-3 ${className}`}>Sawa zbiera myśli o tym miejscu…</p>
    );
  }
  if (state === "failed") {
    return (
      <p className={`text-tekst-3 ${className}`}>
        Tu Sawa milczy. Odezwie się przy następnym miejscu.
      </p>
    );
  }
  const words = text.split(/(\s+)/);
  const wordCount = words.filter((w) => w.trim()).length;
  const spoken = Math.round((wordCount * progress) / 100);
  let seen = 0;
  let cut = words.length;
  for (let i = 0; i < words.length; i++) {
    if (words[i].trim()) seen++;
    if (seen > spoken) {
      cut = i;
      break;
    }
  }
  return (
    <p aria-live="off" className={className}>
      <span className="text-tekst transition-colors">{words.slice(0, cut).join("")}</span>
      <span ref={edgeRef} />
      <span className="text-tekst-3/70">{words.slice(cut).join("")}</span>
    </p>
  );
}

/** Pasek „do następnego tematu”: napełnia się z bieżącą częścią opowieści. */
function NextUp({
  stops,
  activeIndex,
  progress,
  end,
}: {
  stops: MockStop[];
  activeIndex: number;
  progress: number;
  end: RouteViewProps["end"];
}) {
  const next = untilNext(stops, activeIndex);
  if (!next) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-tekst-2">To ostatni temat tej przejażdżki.</p>
        <EndPill end={end} />
      </div>
    );
  }
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm text-tekst-2">
        Dalej <span className="font-bold text-tekst">{next.stop.name}</span>
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-tekst/10">
          <div
            className="h-full origin-left rounded-full bg-glebia"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        </div>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-tekst-3">
          {next.label}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* A. Na żywo: jeden ciągły zapis tego, co mówi Sawa, jak napisy radia */
/* ------------------------------------------------------------------ */

export function RouteViewLive({
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
  transcript,
  togglePlay,
}: RouteViewProps) {
  const reduce = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const edgeRef = useRef<HTMLSpanElement>(null);
  const [following, setFollowing] = useState(true);
  const stop = stops[activeIndex];
  const past = transcript.filter((part) => part.stopIndex < activeIndex);

  // Zapis jedzie za głosem (granica wypowiedzianych słów na ok. 2/3 wysokości),
  // dopóki użytkownik sam nie przewinie
  // biome-ignore lint/correctness/useExhaustiveDependencies: przewijamy przy każdym nowym słowie
  useEffect(() => {
    const el = scrollRef.current;
    const edge = edgeRef.current;
    if (!el || !following) return;
    const top = edge
      ? edge.getBoundingClientRect().top -
        el.getBoundingClientRect().top +
        el.scrollTop -
        el.clientHeight * 0.66
      : el.scrollHeight;
    if (Math.abs(el.scrollTop - top) < 4) return;
    el.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  }, [following, progress, storyText, activeIndex, reduce]);

  // Ręczne przewinięcie (palec, kółko) odpina zapis od głosu; nasze scrollTo tego nie robi
  function stopFollowing() {
    setFollowing(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <BackButton onBack={onBack} compact />
        <div className="min-w-0 flex-1">
          <p className="etykieta flex items-center gap-2">
            <LiveDot on={isPlaying} />
            {isPlaying ? "Sawa opowiada" : "Wstrzymane"}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-tekst-2">
            <span className="font-semibold text-tekst">{formatDuration(durationMin)}</span>
            <Journey legs={legs} />
          </p>
        </div>
        {isDesktop && <SawaMenuButton variant="inline" />}
      </header>

      {stop && (
        <div className="flex items-center gap-2">
          <span className="etykieta">Teraz</span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={stop.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={SPRING}
              className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-mieta-jasna py-1 pl-1 pr-3 text-sm font-bold text-glebia-ciemna"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-glebia text-xs font-extrabold text-white">
                {activeIndex + 1}
              </span>
              <span className="truncate">{stop.name}</span>
            </motion.span>
          </AnimatePresence>
        </div>
      )}

      <div className="relative">
        <div
          ref={scrollRef}
          onTouchMove={stopFollowing}
          onWheel={stopFollowing}
          className="h-[22dvh] touch-pan-y overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent,black_28px,black_calc(100%-24px),transparent)] md:h-[40vh]"
        >
          <div className="pb-[40%] pt-6">
            {past.map((part) => (
              <section key={part.stopIndex} className="mb-4">
                <p className="mb-1 text-xs font-bold text-tekst-3">
                  {part.stopIndex + 1} · {stops[part.stopIndex]?.name}
                </p>
                <p className="text-[15px] leading-relaxed text-tekst-3">{part.text}</p>
              </section>
            ))}
            {stop && (
              <section>
                {past.length > 0 && (
                  <p className="mb-1 text-xs font-bold text-glebia">
                    {activeIndex + 1} · {stop.name}
                  </p>
                )}
                <LiveText
                  text={storyText}
                  progress={progress}
                  state={storyState}
                  edgeRef={edgeRef}
                  className="text-[19px] font-medium leading-[1.5] tracking-[-0.005em]"
                />
              </section>
            )}
          </div>
        </div>
        <AnimatePresence>
          {!following && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={SPRING}
              onClick={() => setFollowing(true)}
              className="szklo absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-bold"
            >
              <LiveDot on={isPlaying} />
              Wróć do Sawy
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-4">
        <PlayButton isPlaying={isPlaying} onToggle={togglePlay} size="lg" />
        <NextUp stops={stops} activeIndex={activeIndex} progress={progress} end={end} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* B. Rozkład: plan jazdy, po którym sam przesuwa się znacznik „Ty”    */
/* ------------------------------------------------------------------ */

type ItineraryRow =
  | { kind: "leg"; leg: Leg; startMin: number }
  | { kind: "stop"; stop: MockStop; index: number };

/** Odcinki i punkty w kolejności jazdy: punkt ląduje pod odcinkiem, w którego czasie wypada. */
function buildItinerary(legs: Leg[], stops: MockStop[]): ItineraryRow[] {
  // Kolejne odcinki tej samej linii łączymy w jeden (jak `journeyLegs`)
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
  transcript,
  goTo,
  togglePlay,
}: RouteViewProps) {
  const reduce = useReducedMotion();
  const rows = buildItinerary(legs, stops);
  const departAt = legs[0]?.departAt;
  // Punkt rozwinięty ręcznie: przeszły (przeczytaj, co mówiła) albo przyszły (opowiedz teraz)
  const [peek, setPeek] = useState<number | null>(null);
  const saidAt = (index: number) => transcript.find((p) => p.stopIndex === index)?.text;
  const activeRef = useRef<HTMLLIElement>(null);

  // Gdy lokalizacja przesunie temat, aktywny wiersz wraca w pole widzenia
  // biome-ignore lint/correctness/useExhaustiveDependencies: reagujemy na zmianę tematu
  useEffect(() => {
    setPeek(null);
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [activeIndex, reduce]);

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
            <p className="etykieta flex items-center gap-2">
              <LiveDot on={isPlaying} />
              Twoja przejażdżka
            </p>
            <h2 className="mt-1 text-[34px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">
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
          {activeIndex + 1} z {stops.length} miejsc
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
          const isOpen = isActive || peek === index;
          const said = saidAt(index);
          return (
            <li key={stop.id} ref={isActive ? activeRef : undefined} className="relative">
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
                    : isOpen
                      ? "bg-tlo-2"
                      : ""
                }`}
              >
                <button
                  type="button"
                  aria-current={isActive ? "location" : undefined}
                  aria-expanded={isOpen}
                  onClick={() => {
                    if (isActive) return;
                    haptic();
                    setPeek((current) => (current === index ? null : index));
                  }}
                  className="flex w-full items-center gap-3 rounded-[22px] py-2.5 pl-2 pr-3 text-left"
                >
                  <span
                    className={`relative flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-white text-[13px] font-extrabold transition-colors duration-300 ${
                      isActive
                        ? "bg-glebia text-white"
                        : isDone
                          ? "bg-mieta text-glebia-ciemna"
                          : "bg-koral text-white"
                    }`}
                  >
                    {/* Znacznik „Ty” przeskakuje sprężyną między punktami */}
                    {isActive && (
                      <motion.span
                        layoutId="trasa-b-ty"
                        transition={SPRING}
                        className="absolute -inset-1.5 rounded-full border-2 border-glebia/40"
                      />
                    )}
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate font-bold ${isActive ? "text-[17px]" : "text-[15px]"} ${
                        isDone && !isOpen ? "text-tekst-2" : ""
                      }`}
                    >
                      {stop.name}
                    </span>
                    <span className="block text-xs text-tekst-3">
                      {isActive
                        ? "Sawa opowiada"
                        : isDone
                          ? "Opowiedziane"
                          : `${stopLineLabel(stop)} · za ok. ${Math.max(1, stop.etaMin - (stops[activeIndex]?.etaMin ?? 0))} min`}
                    </span>
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="body"
                      initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                      animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                      transition={SPRING}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pl-[52px]">
                        {isActive ? (
                          <>
                            <LiveText
                              text={storyText}
                              progress={progress}
                              state={storyState}
                              className="line-clamp-6 text-[15px] leading-relaxed"
                            />
                            <div className="mt-3 flex items-center gap-3">
                              <PlayButton isPlaying={isPlaying} onToggle={togglePlay} />
                              <NextUp
                                stops={stops}
                                activeIndex={activeIndex}
                                progress={progress}
                                end={null}
                              />
                            </div>
                          </>
                        ) : isDone ? (
                          <p className="text-[14px] leading-relaxed text-tekst-2">
                            {said ?? "Sawa była tu, zanim zaczęło się nagrywanie."}
                          </p>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[13px] text-tekst-2">
                              Sawa zacznie sama, gdy tu dojedziesz.
                            </p>
                            <button
                              type="button"
                              onClick={() => goTo(index)}
                              className="h-9 shrink-0 rounded-full bg-white px-3.5 text-[13px] font-bold text-glebia shadow-[0_1px_3px_rgba(16,43,42,0.12)] transition-transform active:scale-[0.96]"
                            >
                              Opowiedz teraz
                            </button>
                          </div>
                        )}
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
/* C. Rozdziały: karty jadą same za lokalizacją, w bok można podejrzeć */
/* ------------------------------------------------------------------ */

export function RouteViewChapters({
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
  transcript,
  goTo,
  togglePlay,
}: RouteViewProps) {
  const railRef = useRef<HTMLOListElement>(null);
  const reduce = useReducedMotion();
  const [viewed, setViewed] = useState(activeIndex);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isLive = viewed === activeIndex;
  const saidAt = (index: number) => transcript.find((p) => p.stopIndex === index)?.text;

  function scrollToCard(index: number, smooth = true) {
    const rail = railRef.current;
    const card = rail?.children[index] as HTMLElement | undefined;
    if (!rail || !card) return;
    const left = card.offsetLeft - (rail.clientWidth - card.clientWidth) / 2;
    rail.scrollTo({ left, behavior: smooth && !reduce ? "smooth" : "auto" });
  }

  // Lokalizacja zmieniła temat: karta jedzie sama, ale tylko gdy użytkownik nie podgląda innej
  // biome-ignore lint/correctness/useExhaustiveDependencies: reagujemy tylko na zmianę tematu
  useEffect(() => {
    if (viewed === activeIndex - 1 || viewed === activeIndex) {
      setViewed(activeIndex);
      scrollToCard(activeIndex);
    }
  }, [activeIndex]);

  // Przewijanie palcem tylko zmienia oglądaną kartę; o tym, co mówi Sawa, decyduje lokalizacja
  function onScroll() {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const rail = railRef.current;
      if (!rail) return;
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
      setViewed(nearest);
    }, 90);
  }

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

      <div className="relative">
        <ol
          ref={railRef}
          onScroll={onScroll}
          aria-label="Rozdziały przejażdżki"
          className="-mx-4 flex touch-pan-x snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-[7%] py-2 [scrollbar-width:none] md:-mx-6"
        >
          {stops.map((stop, index) => {
            const isActive = index === activeIndex;
            const isDone = index < activeIndex;
            return (
              <li
                key={stop.id}
                aria-current={isActive ? "location" : undefined}
                className="w-[86%] shrink-0 snap-center snap-always"
              >
                <motion.article
                  animate={{
                    scale: index === viewed ? 1 : 0.94,
                    opacity: index === viewed ? 1 : 0.55,
                  }}
                  transition={SPRING}
                  aria-label={`Rozdział ${index + 1} z ${stops.length}: ${stop.name}`}
                  className="relative flex h-full min-h-[290px] flex-col overflow-hidden rounded-[28px] bg-white p-5 shadow-[0_1px_2px_rgba(16,43,42,0.06),0_14px_34px_rgba(16,43,42,0.12)]"
                >
                  <p className="etykieta flex items-center gap-2">
                    {isActive ? (
                      <>
                        <LiveDot on={isPlaying} /> Teraz
                      </>
                    ) : isDone ? (
                      "Już było"
                    ) : (
                      `Za ok. ${Math.max(1, stop.etaMin - (stops[activeIndex]?.etaMin ?? 0))} min`
                    )}
                    <span className="ml-auto tabular-nums">
                      {index + 1}/{stops.length}
                    </span>
                  </p>
                  <h3 className="mt-1 text-[24px] font-extrabold leading-[1.1] tracking-[-0.02em]">
                    {stop.name}
                  </h3>
                  <p className="mt-2 flex items-center gap-2 text-[13px] text-tekst-3">
                    <LineBadge line={stop.line} mode={stop.mode ?? "tram"} />
                  </p>

                  <div className="mt-3 flex-1">
                    {isActive ? (
                      <LiveText
                        text={storyText}
                        progress={progress}
                        state={storyState}
                        className="line-clamp-6 text-[15px] leading-relaxed"
                      />
                    ) : isDone ? (
                      <p className="line-clamp-6 text-[15px] leading-relaxed text-tekst-2">
                        {saidAt(index) ?? "Sawa była tu, zanim zaczęło się nagrywanie."}
                      </p>
                    ) : (
                      <p className="text-[15px] leading-relaxed text-tekst-3">
                        Sawa zacznie sama, gdy tu dojedziesz.
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    {isActive ? (
                      <>
                        <PlayButton isPlaying={isPlaying} onToggle={togglePlay} />
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-tlo-2">
                          <div
                            className="h-full origin-left rounded-full bg-glebia"
                            style={{ transform: `scaleX(${progress / 100})` }}
                          />
                        </div>
                      </>
                    ) : isDone ? null : (
                      <button
                        type="button"
                        onClick={() => goTo(index)}
                        className="h-10 rounded-full bg-tlo-2 px-4 text-sm font-bold text-glebia transition-transform active:scale-[0.96]"
                      >
                        Opowiedz teraz
                      </button>
                    )}
                  </div>
                </motion.article>
              </li>
            );
          })}
        </ol>

        <AnimatePresence>
          {!isLive && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={SPRING}
              onClick={() => {
                haptic();
                setViewed(activeIndex);
                scrollToCard(activeIndex);
              }}
              className="szklo absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-bold"
            >
              <LiveDot on={isPlaying} />
              Wróć do Sawy
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-1.5 pt-2" aria-hidden="true">
        {stops.length <= 16 &&
          stops.map((stop, index) => (
            <motion.span
              key={stop.id}
              animate={{ width: index === activeIndex ? 18 : 6 }}
              transition={SPRING}
              className={`h-1.5 rounded-full ${
                index === activeIndex
                  ? "bg-glebia"
                  : index < activeIndex
                    ? "bg-mieta"
                    : "bg-tekst/15"
              }`}
            />
          ))}
      </div>

      <EndPill end={end} />
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
