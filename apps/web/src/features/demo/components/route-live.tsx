"use client";

import type { Leg } from "@sawa/shared";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type Ref, useEffect, useRef, useState } from "react";
import { SPRING } from "../lib/device";
import { formatDuration } from "../lib/format";
import type { MockStop } from "../lib/mock-data";
import { Attribution, Departures } from "./departures";
import { ChevronLeftIcon, PauseIcon, PinIcon, PlayIcon } from "./icons";
import { Journey } from "./line-badge";
import { SawaMenuButton } from "./sawa-menu";

/*
 * Ekran trasy na żywo (wybrany wariant A, propozycje w docs/ui/README.md).
 * O tym, o czym Sawa mówi, decyduje lokalizacja (T-106), a nie użytkownik. Sawa opowiada jednym
 * ciągłym strumieniem i sama przechodzi od tematu do tematu, więc nie ma przycisków
 * „poprzednia/następna”. Jest pauza, a skok do przodu („Opowiedz teraz”) to wyjątek.
 */

/** Fragment strumienia Sawy przypisany do punktu trasy (temat, o którym wtedy mówiła). */
export type TranscriptPart = { stopIndex: number; text: string };

export type RouteLiveProps = {
  durationMin: number;
  end: { label: string; reached: boolean } | null;
  legs: Leg[];
  /** Podpis źródeł danych trasy (`Route.attribution`). */
  attribution: string[];
  stops: MockStop[];
  /** Punkt, przy którym jest użytkownik i o którym Sawa teraz mówi. */
  activeIndex: number;
  onBack: () => void;
  isDesktop: boolean;
  isPlaying: boolean;
  /** Ile bieżącego tematu już padło (0–100). */
  progress: number;
  /** Za ile sekund następny temat według zegara jazdy. */
  nextInSec: number | null;
  storyText: string | null;
  storyState: "loading" | "ready" | "failed";
  /** Całe dotychczasowe opowiadanie, ostatni fragment jest na żywo. */
  transcript: TranscriptPart[];
  togglePlay: () => void;
};

/** Za ile następny temat. Dziś z zegara jazdy, docelowo z odległości do punktu. */
function untilNext(stops: MockStop[], activeIndex: number, nextInSec: number | null) {
  const next = stops[activeIndex + 1];
  if (!next) return null;
  if (nextInSec === null || nextInSec < 60) return { stop: next, label: "za chwilę" };
  return { stop: next, label: `za ok. ${Math.round(nextInSec / 60)} min` };
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

function EndPill({ end }: { end: RouteLiveProps["end"] }) {
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
  state: RouteLiveProps["storyState"];
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
  nextInSec,
  end,
}: {
  stops: MockStop[];
  activeIndex: number;
  progress: number;
  nextInSec: number | null;
  end: RouteLiveProps["end"];
}) {
  const next = untilNext(stops, activeIndex, nextInSec);
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
/* Ekran: jeden ciągły zapis tego, co mówi Sawa, jak napisy w radiu   */
/* ------------------------------------------------------------------ */

export function RouteLive({
  durationMin,
  end,
  legs,
  attribution,
  stops,
  activeIndex,
  onBack,
  isDesktop,
  isPlaying,
  progress,
  nextInSec,
  storyText,
  storyState,
  transcript,
  togglePlay,
}: RouteLiveProps) {
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
      {isDesktop && <SawaMenuButton variant="inline" />}
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
      </header>

      <Departures legs={legs} />

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
          className="h-[max(140px,calc(var(--trasa-widoczne,60dvh)-250px))] touch-pan-y overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent,black_28px,black_calc(100%-24px),transparent)]"
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
        <NextUp
          stops={stops}
          activeIndex={activeIndex}
          progress={progress}
          nextInSec={nextInSec}
          end={end}
        />
      </div>

      <Attribution lines={attribution} />
    </div>
  );
}
