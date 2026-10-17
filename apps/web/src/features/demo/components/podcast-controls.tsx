"use client";

import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useState } from "react";
import { haptic, SPRING } from "../lib/device";
import type { MockStop } from "../lib/mock-data";
import { formatClock } from "../lib/podcast";
import { dueIndex, storyStartSec } from "../lib/ride-clock";
import { PauseIcon, PlayIcon, SkipNextIcon, SkipPrevIcon, SparkIcon, StopIcon } from "./icons";

// Połowa kciuka suwaka (30 px, `.suwak` w globals.css): kropki i wypełnienie liczymy do jego środka
const THUMB_HALF_PX = 15;
// Przy gęstszej trasie kropki zlewają się w kreskę, więc ich nie rysujemy
const MAX_DOTS = 24;

/** Środek kciuka dla ułamka 0–1, jak `thumbCenter` w home-panel.tsx. */
function thumbAt(fraction: number): string {
  return `calc(${THUMB_HALF_PX}px + (100% - ${2 * THUMB_HALF_PX}px) * ${fraction})`;
}

export type PodcastControlsProps = {
  stops: MockStop[];
  activeIndex: number;
  /** Czas jazdy (zegar jazdy) i długość całej przejażdżki, w sekundach. */
  rideSec: number;
  totalSec: number;
  isPlaying: boolean;
  /** Sawa czeka na pierwsze miejsce. */
  waiting: boolean;
  onToggle: () => void;
  onStop: () => void;
  onBack: () => void;
  onNext: () => void;
  onMore: () => void;
  /** Puszczenie suwaka: przejażdżka przeskakuje do tej sekundy. */
  onSeek: (sec: number) => void;
};

/**
 * Sterowanie opowieścią (wariant A): miejsce, suwak całej przejażdżki z kropkami miejsc
 * i przyciski stop, wstecz, odtwarzanie, dalej. Przeciąganie suwaka tylko pokazuje cel,
 * przeskok następuje po puszczeniu.
 */
export function PodcastControls({
  stops,
  activeIndex,
  rideSec,
  totalSec,
  isPlaying,
  waiting,
  onToggle,
  onStop,
  onBack,
  onNext,
  onMore,
  onSeek,
}: PodcastControlsProps) {
  const [dragSec, setDragSec] = useState<number | null>(null);
  const total = Math.max(totalSec, 1);
  const sec = Math.min(total, dragSec ?? rideSec);
  const index = dragSec === null ? activeIndex : dueIndex(stops, dragSec);
  const stop = stops[index];
  const next = stops[index + 1];
  const hasNext = activeIndex < stops.length - 1;

  function commit() {
    if (dragSec === null) return;
    haptic();
    onSeek(dragSec);
    setDragSec(null);
  }

  const status =
    dragSec !== null
      ? "Przejdź do"
      : waiting
        ? "Najpierw"
        : isPlaying
          ? "Teraz opowiada"
          : "Wstrzymane";
  const nextLabel = next
    ? `Dalej: ${next.name} · za ${formatClock(storyStartSec(next) - sec)}`
    : "Ostatnie miejsce tej przejażdżki";

  return (
    <div className="flex flex-col gap-3">
      <div className="min-w-0">
        <p className="etykieta">
          {status} · {index + 1} z {stops.length}
        </p>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.h2
            key={stop?.id ?? "none"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={SPRING}
            className="mt-1 truncate text-[24px] font-extrabold leading-tight tracking-[-0.03em]"
          >
            {stop?.name ?? "Trasa"}
          </motion.h2>
        </AnimatePresence>
        <p className="mt-0.5 truncate text-sm text-tekst-2">{nextLabel}</p>
      </div>

      <div>
        <div className="relative">
          {stops.length <= MAX_DOTS &&
            stops.map((s) => (
              <span
                key={s.id}
                aria-hidden="true"
                className={`pointer-events-none absolute top-[13px] z-10 size-1.5 -translate-x-1/2 rounded-full ${
                  storyStartSec(s) <= sec ? "bg-white" : "bg-mieta"
                }`}
                style={{ left: thumbAt(storyStartSec(s) / total) }}
              />
            ))}
          <input
            type="range"
            min={0}
            max={total}
            step={1}
            value={Math.round(sec)}
            aria-label="Miejsce w przejażdżce"
            aria-valuetext={`${stop?.name ?? ""}, ${formatClock(sec)}`}
            onChange={(event) => setDragSec(Number(event.target.value))}
            onPointerUp={commit}
            onKeyUp={commit}
            onBlur={commit}
            style={{ ["--postep" as string]: thumbAt(sec / total) }}
            className="suwak relative block"
          />
        </div>
        <div className="flex justify-between text-xs font-semibold tabular-nums text-tekst-3">
          <span>{formatClock(sec)}</span>
          <span>−{formatClock(total - sec)}</span>
        </div>
      </div>

      <div className="grid grid-cols-5 items-center justify-items-center">
        <RoundButton label="Zatrzymaj i wróć na początek opowieści" onClick={onStop}>
          <StopIcon className="size-5" />
        </RoundButton>
        <RoundButton label="Wstecz" onClick={onBack}>
          <SkipPrevIcon className="size-6" />
        </RoundButton>
        <motion.button
          type="button"
          onClick={() => {
            haptic();
            onToggle();
          }}
          aria-label={isPlaying ? "Wstrzymaj Sawę" : "Wznów Sawę"}
          whileTap={{ scale: 0.92 }}
          transition={SPRING}
          className="flex size-16 items-center justify-center rounded-full bg-glebia text-white shadow-[0_8px_20px_rgba(23,112,111,0.35)] transition-colors hover:bg-glebia-ciemna"
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
                <PauseIcon className="size-7" />
              ) : (
                <PlayIcon className="size-7 translate-x-[1px]" />
              )}
            </motion.span>
          </AnimatePresence>
        </motion.button>
        <RoundButton label="Następne miejsce" onClick={onNext} disabled={!hasNext}>
          <SkipNextIcon className="size-6" />
        </RoundButton>
        <RoundButton label="Więcej o tym miejscu" onClick={onMore}>
          <SparkIcon className="size-5" />
        </RoundButton>
      </div>
    </div>
  );
}

function RoundButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        haptic(4);
        onClick();
      }}
      className="flex size-12 items-center justify-center rounded-full text-tekst transition-[transform,background-color] hover:bg-mieta-jasna active:scale-[0.92] disabled:opacity-35 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
