"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useState } from "react";
import { Spinner } from "@/components/waiting";
import { useLang, useT } from "@/features/i18n";
import { haptic, SPRING } from "../lib/device";
import type { MockStop } from "../lib/mock-data";
import { formatClock, inMinutes, splitName } from "../lib/podcast";
import { dueIndex, storyStartSec } from "../lib/ride-clock";
import {
  CloseIcon,
  PauseIcon,
  PlayIcon,
  SkipNextIcon,
  SkipPrevIcon,
  SparkIcon,
  StopIcon,
} from "./icons";

// Połowa kciuka suwaka (20 px, `.suwak-cienki` w globals.css): kropki i wypełnienie liczymy do jego środka
const THUMB_HALF_PX = 10;
// Przy gęstszej trasie kropki zlewają się w kreskę, więc ich nie rysujemy
const MAX_DOTS = 24;

/** Środek kciuka dla ułamka 0–1, jak `thumbCenter` w home-panel.tsx. */
function thumbAt(fraction: number): string {
  return `calc(${THUMB_HALF_PX}px + (100% - ${2 * THUMB_HALF_PX}px) * ${fraction})`;
}

export type PodcastProps = {
  stops: MockStop[];
  activeIndex: number;
  /** Czas jazdy (zegar jazdy) i długość całej przejażdżki, w sekundach. */
  rideSec: number;
  totalSec: number;
  isPlaying: boolean;
  /** Sawa czeka na pierwsze miejsce. */
  waiting: boolean;
  /** Użytkownik zatrzymał Sawę (stop albo pauza): zegar jazdy stoi do wznowienia. */
  held?: boolean;
  /** Opowieść o bieżącym miejscu jeszcze się ładuje (tekst albo głos). */
  loading: boolean;
};

export type Podcast = ReturnType<typeof usePodcast>;

/** Pulsująca kropka „na żywo”; przy pauzie stoi i szarzeje. */
export function LiveDot({ on }: { on: boolean }) {
  const reduce = useReducedMotion();
  return (
    <span className="relative flex size-2 shrink-0">
      {on && !reduce && (
        <motion.span
          className="absolute inset-0 rounded-full bg-koral"
          animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
          transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "easeOut" }}
        />
      )}
      <span
        className={`relative size-2 rounded-full transition-colors ${on ? "bg-koral" : "bg-tekst-3"}`}
      />
    </span>
  );
}

/**
 * Wspólny stan nagłówka i doku. Przeciąganie suwaka tylko pokazuje cel (nazwa w nagłówku
 * zmienia się już w trakcie), przeskok następuje po puszczeniu.
 */
export function usePodcast({
  stops,
  activeIndex,
  rideSec,
  totalSec,
  isPlaying,
  waiting,
  held = false,
  loading,
}: PodcastProps) {
  const lang = useLang();
  const t = useT();
  const [dragSec, setDragSec] = useState<number | null>(null);
  const total = Math.max(totalSec, 1);
  const sec = Math.min(total, dragSec ?? rideSec);
  const dragging = dragSec !== null;
  const index = dragging ? dueIndex(stops, dragSec) : activeIndex;
  const stop = stops[index];
  const next = stops[index + 1];

  // Odtwarzanie włączone, a opowieści jeszcze nie ma: jak „buforowanie” w Podcastach
  const buffering = isPlaying && loading && !waiting && !dragging;
  const status = dragging
    ? t("Przejdź do", "Go to")
    : waiting && !held
      ? t("Najpierw", "First up")
      : buffering
        ? t("Sawa szykuje opowieść", "Sawa is getting ready")
        : isPlaying
          ? t("Teraz", "Now")
          : t("Wstrzymane", "Paused");

  // Jedno zdanie nad suwakiem: przed pierwszym miejscem kiedy Sawa zacznie, potem co dalej
  const hint =
    waiting && !dragging && stop
      ? {
          lead: t("Sawa zacznie na miejscu", "Sawa will start once you're there"),
          name: null,
          when: inMinutes(storyStartSec(stop) - sec, lang),
        }
      : next
        ? {
            lead: t("Dalej", "Next"),
            name: splitName(next.name).title,
            when: inMinutes(storyStartSec(next) - sec, lang),
          }
        : {
            lead: t("Ostatnie miejsce tej przejażdżki", "Last place on this ride"),
            name: null,
            when: null,
          };

  return {
    stops,
    index,
    stop,
    sec,
    total,
    dragSec,
    setDragSec,
    isPlaying,
    waiting,
    held,
    buffering,
    status,
    hint,
    hasNext: activeIndex < stops.length - 1,
  };
}

/**
 * Góra ekranu, jak „teraz odtwarzane” z tekstem w Muzyce: status i numer miejsca, duża nazwa,
 * pod nią adres. Zapis opowieści idzie zaraz pod tym, sterowanie jest w doku na dole.
 */
export function PodcastHeader({ podcast, onLeave }: { podcast: Podcast; onLeave: () => void }) {
  const reduce = useReducedMotion();
  const t = useT();
  const { stop, stops, index, status, buffering, isPlaying } = podcast;
  const name = stop ? splitName(stop.name) : null;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2.5">
        <p className="etykieta flex min-w-0 flex-1 items-center gap-2" aria-live="polite">
          {buffering ? <Spinner className="size-3 text-koral" /> : <LiveDot on={isPlaying} />}
          <span className="truncate">
            {status} · {index + 1} {t("z", "of")} {stops.length}
          </span>
        </p>
        {/* Krzyżyk anuluje trasę i wraca do planu, jak zamknięcie arkusza w Mapach */}
        <button
          type="button"
          onClick={onLeave}
          aria-label={t("Anuluj trasę", "Cancel route")}
          className="-mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-tlo-2 text-tekst-2 transition-[transform,background-color] hover:bg-tekst/10 active:scale-[0.92]"
        >
          <CloseIcon className="size-[18px]" />
        </button>
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={stop?.id ?? "none"}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={SPRING}
          className="mt-1.5"
        >
          <h2 className="line-clamp-2 text-[24px] font-extrabold leading-[1.15] tracking-[-0.03em] text-tekst">
            {name?.title ?? t("Trasa", "Route")}
          </h2>
          {name?.sub && <p className="mt-1 truncate text-sm text-tekst-2">{name.sub}</p>}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export type PodcastDockProps = {
  podcast: Podcast;
  onToggle: () => void;
  onStop: () => void;
  onBack: () => void;
  onNext: () => void;
  onMore: () => void;
  /** Puszczenie suwaka: przejażdżka przeskakuje do tej sekundy. */
  onSeek: (sec: number) => void;
};

/**
 * Dok przy dolnej krawędzi, pod kciukiem: co dalej, suwak całej przejażdżki i jeden rząd
 * przycisków. Rzadsze akcje („Więcej”, stop) są ikonami po bokach transportu, jak w Muzyce.
 */
export function PodcastDock({
  podcast,
  onToggle,
  onStop,
  onBack,
  onNext,
  onMore,
  onSeek,
}: PodcastDockProps) {
  const t = useT();
  const { stops, stop, sec, total, dragSec, setDragSec, hint, buffering, isPlaying } = podcast;

  function commit() {
    if (dragSec === null) return;
    haptic();
    onSeek(dragSec);
    setDragSec(null);
  }

  return (
    <div className="flex flex-col">
      <p className="flex min-w-0 items-baseline gap-1.5 text-[13px] text-tekst-2">
        <span className="min-w-0 truncate">
          {hint.lead}
          {hint.name && (
            <>
              : <span className="font-semibold text-tekst">{hint.name}</span>
            </>
          )}
        </span>
        {hint.when && <span className="shrink-0 tabular-nums text-tekst-3">· {hint.when}</span>}
      </p>

      <div className="mt-2">
        <div className="relative">
          {stops.length <= MAX_DOTS &&
            stops.map((s) => (
              <span
                key={s.id}
                aria-hidden="true"
                className={`pointer-events-none absolute top-[14px] z-10 size-1 -translate-x-1/2 rounded-full ${
                  storyStartSec(s) <= sec ? "bg-white/90" : "bg-tekst/25"
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
            aria-label={t("Miejsce w przejażdżce", "Position in the ride")}
            aria-valuetext={`${stop?.name ?? ""}, ${formatClock(sec)}`}
            onChange={(event) => setDragSec(Number(event.target.value))}
            onPointerUp={commit}
            onKeyUp={commit}
            onBlur={commit}
            style={{ ["--postep" as string]: thumbAt(sec / total) }}
            className="suwak suwak-cienki relative block"
          />
        </div>
        <div className="-mt-0.5 flex justify-between text-[11px] font-semibold tabular-nums text-tekst-3">
          <span>{formatClock(sec)}</span>
          <span>−{formatClock(total - sec)}</span>
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            haptic(4);
            onMore();
          }}
          aria-label={t("Więcej o tym miejscu", "More about this place")}
          title={t("Więcej o tym miejscu", "More about this place")}
          className="flex size-11 items-center justify-center rounded-full bg-mieta-jasna text-glebia-ciemna transition-transform active:scale-[0.92]"
        >
          <SparkIcon className="size-5" />
        </button>
        <div className="flex items-center gap-4">
          <RoundButton label={t("Wstecz", "Back")} onClick={onBack}>
            <SkipPrevIcon className="size-7" />
          </RoundButton>
          <motion.button
            type="button"
            onClick={() => {
              haptic();
              onToggle();
            }}
            aria-label={
              isPlaying
                ? t("Wstrzymaj Sawę", "Pause Sawa")
                : podcast.waiting && !podcast.held
                  ? t("Opowiedz teraz", "Tell me now")
                  : t("Wznów Sawę", "Resume Sawa")
            }
            aria-busy={buffering}
            whileTap={{ scale: 0.92 }}
            transition={SPRING}
            className="relative flex size-[68px] items-center justify-center rounded-full bg-glebia text-white shadow-[0_8px_20px_rgba(23,112,111,0.3)] transition-colors hover:bg-glebia-ciemna"
          >
            <BufferRing show={buffering} />
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={isPlaying ? "pause" : "play"}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.25 }}
              >
                {isPlaying ? (
                  <PauseIcon className="size-8" />
                ) : (
                  <PlayIcon className="size-8 translate-x-[2px]" />
                )}
              </motion.span>
            </AnimatePresence>
          </motion.button>
          <RoundButton
            label={t("Następne miejsce", "Next place")}
            onClick={onNext}
            disabled={!podcast.hasNext}
          >
            <SkipNextIcon className="size-7" />
          </RoundButton>
        </div>
        <button
          type="button"
          onClick={() => {
            haptic(4);
            onStop();
          }}
          aria-label={t(
            "Zatrzymaj i wróć na początek opowieści",
            "Stop and go back to the start of the story",
          )}
          title={t("Zatrzymaj", "Stop")}
          className="flex size-11 items-center justify-center rounded-full text-tekst-2 transition-[transform,background-color] hover:bg-tlo-2 active:scale-[0.92]"
        >
          <StopIcon className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/** Obracający się łuk wokół przycisku odtwarzania, póki opowieść się ładuje. */
function BufferRing({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.svg
          key="pierscien"
          aria-hidden="true"
          viewBox="0 0 80 80"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", bounce: 0, duration: 0.3 }}
          className="pointer-events-none absolute -inset-[6px] size-[80px]"
        >
          <circle
            cx="40"
            cy="40"
            r="37"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-glebia/15"
          />
          <circle
            cx="40"
            cy="40"
            r="37"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="58 175"
            className="origin-center animate-spin text-glebia [animation-duration:1.1s]"
          />
        </motion.svg>
      )}
    </AnimatePresence>
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
      className="flex size-14 items-center justify-center rounded-full text-tekst transition-[transform,background-color] hover:bg-tlo-2 active:scale-[0.88] active:bg-tlo-2 disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
