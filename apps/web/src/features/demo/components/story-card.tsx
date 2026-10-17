"use client";

import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { haptic, project, SPRING, SPRING_FLICK } from "../lib/device";
import { type MockStop, stopLineLabel } from "../lib/mock-data";
import { PauseIcon, PlayIcon, SkipNextIcon, SkipPrevIcon } from "./icons";

type StoryCardProps = {
  stop: MockStop;
  index: number;
  total: number;
  // 1 = przejście do następnego (karta wjeżdża z prawej), -1 = do poprzedniego
  direction: number;
  isPlaying: boolean;
  progress: number;
  /** Opowieść Sawy z `POST /v1/stories`; null, póki się ładuje. */
  text: string | null;
  state: "loading" | "ready" | "failed";
  onPrev: () => void;
  onNext: () => void;
  onTogglePlay: () => void;
};

// Próg przełączenia liczony z miejsca, w którym karta by się zatrzymała, a nie z miejsca puszczenia
const SWIPE_THRESHOLD_PX = 90;

const slide = {
  enter: (direction: number) => ({ x: direction * 120, opacity: 0, scale: 0.97 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (direction: number) => ({ x: direction * -120, opacity: 0, scale: 0.97 }),
};

/** Odtwarzacz opowieści. Kartę można przesunąć palcem w bok, żeby przejść do sąsiedniego punktu. */
export function StoryCard({
  stop,
  index,
  total,
  direction,
  isPlaying,
  progress,
  text,
  state,
  onPrev,
  onNext,
  onTogglePlay,
}: StoryCardProps) {
  const hasPrev = index > 0;
  const hasNext = index < total - 1;

  function handleDragEnd(_: unknown, info: PanInfo) {
    const landing = info.offset.x + project(info.velocity.x, 0.99);
    if (landing < -SWIPE_THRESHOLD_PX && hasNext) {
      haptic();
      onNext();
    } else if (landing > SWIPE_THRESHOLD_PX && hasPrev) {
      haptic();
      onPrev();
    }
  }

  return (
    <div className="relative">
      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.article
          key={stop.id}
          custom={direction}
          variants={slide}
          initial="enter"
          animate="center"
          exit="exit"
          transition={SPRING_FLICK}
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: hasNext ? 0.9 : 0.15, right: hasPrev ? 0.9 : 0.15 }}
          dragTransition={{ bounceStiffness: 500, bounceDamping: 40 }}
          onDragEnd={handleDragEnd}
          aria-roledescription="opowieść"
          aria-label={`Opowieść ${index + 1} z ${total}: ${stop.name}`}
          className="cursor-grab touch-pan-y rounded-3xl bg-powierzchnia p-4 shadow-[0_1px_2px_rgba(16,43,42,0.06),0_10px_30px_rgba(16,43,42,0.10)] active:cursor-grabbing md:p-5"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-koral text-[15px] font-extrabold text-white shadow-[0_3px_8px_rgba(242,117,95,0.35)]">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="etykieta">
                {stop.mode === "walk" ? "Opowieść po drodze" : "Opowieść z okna"}
              </p>
              <h3 className="truncate text-[17px] font-extrabold leading-snug tracking-[-0.01em]">
                {stop.name}
              </h3>
            </div>
            <span className="shrink-0 rounded-full bg-mieta-jasna px-2.5 py-1 text-xs font-bold text-glebia-ciemna">
              {stopLineLabel(stop)}
            </span>
          </div>

          <p
            aria-live="polite"
            className={`mt-3 line-clamp-5 min-h-[44px] text-[15px] leading-relaxed text-tekst-2 transition-opacity duration-300 ${
              state === "loading" ? "animate-pulse opacity-60" : ""
            }`}
          >
            {state === "loading"
              ? "Sawa przypomina sobie, co wie o tym miejscu…"
              : state === "failed"
                ? "Tym razem Sawa nic nie powie. Jedziemy dalej."
                : text}
          </p>

          <div
            role="progressbar"
            aria-label="Postęp opowieści"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            className="mt-4 h-1.5 overflow-hidden rounded-full bg-tlo-2"
          >
            <div
              className="h-full origin-left rounded-full bg-glebia"
              style={{ transform: `scaleX(${progress / 100})` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-xs font-semibold text-tekst-3 tabular-nums">
            <span>
              {index + 1} z {total}
            </span>
            <span>po ok. {stop.etaMin} min</span>
          </div>
        </motion.article>
      </AnimatePresence>

      <div className="mt-3 flex items-center justify-center gap-5">
        <button
          type="button"
          onClick={onPrev}
          disabled={!hasPrev}
          aria-label="Poprzednia opowieść"
          className="flex size-12 items-center justify-center rounded-full text-tekst transition-[transform,opacity,background-color] hover:bg-tlo-2 active:scale-[0.92] disabled:opacity-30"
        >
          <SkipPrevIcon className="size-6" />
        </button>
        <motion.button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? "Pauza" : "Odtwarzaj"}
          whileTap={{ scale: 0.92 }}
          transition={SPRING}
          className="flex size-16 items-center justify-center rounded-full bg-glebia text-white shadow-[0_6px_16px_rgba(23,112,111,0.3)] transition-colors hover:bg-glebia-ciemna"
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
        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          aria-label="Następna opowieść"
          className="flex size-12 items-center justify-center rounded-full text-tekst transition-[transform,opacity,background-color] hover:bg-tlo-2 active:scale-[0.92] disabled:opacity-30"
        >
          <SkipNextIcon className="size-6" />
        </button>
      </div>
    </div>
  );
}
