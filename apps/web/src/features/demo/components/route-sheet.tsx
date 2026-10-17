"use client";

import {
  animate,
  motion,
  type PanInfo,
  useDragControls,
  useMotionValue,
  useTransform,
} from "motion/react";
import { type PointerEvent, type ReactNode, useCallback, useEffect, useState } from "react";
import { haptic, project, SPRING, SPRING_FLICK } from "../lib/device";
import { formatDuration } from "../lib/format";
import type { MockStop } from "../lib/mock-data";
import { ChevronLeftIcon, TramIcon } from "./icons";
import { Logo } from "./logo";
import { StoryCard } from "./story-card";

// Placeholder: opowieść trwa stały czas. Docelowo długość wynika z czasu do punktu i API (T-42).
const PLACEHOLDER_STORY_MS = 8000;

type RouteSheetProps = {
  durationMin: number;
  stops: MockStop[];
  activeIndex: number;
  onActiveChange: (index: number) => void;
  onBack: () => void;
  isDesktop: boolean;
  /** Ile pikseli od dołu zasłania arkusz (telefon), żeby mapa wiedziała, gdzie jest jej widoczna część. */
  onCoverChange: (px: number) => void;
};

/** Trasa: arkusz z punktami zatrzymania na telefonie, pływający panel na desktopie. */
export function RouteSheet(props: RouteSheetProps) {
  const { stops, activeIndex, onActiveChange } = props;
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [direction, setDirection] = useState(1);
  const hasNext = activeIndex < stops.length - 1;

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= stops.length || index === activeIndex) return;
      setDirection(index > activeIndex ? 1 : -1);
      setProgress(0);
      setIsPlaying(true);
      onActiveChange(index);
    },
    [activeIndex, stops.length, onActiveChange],
  );

  // Postęp opowieści liczony w klatkach animacji, żeby pasek szedł płynnie
  useEffect(() => {
    if (!isPlaying) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      setProgress((current) => Math.min(100, current + (delta / PLACEHOLDER_STORY_MS) * 100));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying]);

  useEffect(() => {
    if (progress < 100) return;
    if (hasNext) goTo(activeIndex + 1);
    else setIsPlaying(false);
  }, [progress, hasNext, activeIndex, goTo]);

  const togglePlay = useCallback(() => {
    setIsPlaying((playing) => {
      if (!playing && progress >= 100) setProgress(0);
      return !playing;
    });
  }, [progress]);

  // Klawiatura na desktopie: strzałki i spacja
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, button, [contenteditable]")) return;
      if (event.key === "ArrowRight") goTo(activeIndex + 1);
      else if (event.key === "ArrowLeft") goTo(activeIndex - 1);
      else if (event.key === " ") {
        event.preventDefault();
        togglePlay();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, goTo, togglePlay]);

  const content = (onHeaderPointerDown?: (event: PointerEvent) => void) => (
    <SheetContent
      {...props}
      isPlaying={isPlaying}
      progress={progress}
      direction={direction}
      goTo={goTo}
      togglePlay={togglePlay}
      onHeaderPointerDown={onHeaderPointerDown}
    />
  );

  return props.isDesktop ? (
    <DesktopPanel>{content()}</DesktopPanel>
  ) : (
    <MobileSheet onCoverChange={props.onCoverChange}>{content}</MobileSheet>
  );
}

function DesktopPanel({ children }: { children: ReactNode }) {
  return (
    <motion.section
      aria-label="Trasa"
      initial={{ opacity: 0, x: -32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -32 }}
      transition={SPRING}
      className="karta absolute bottom-6 left-6 top-6 z-20 flex w-[400px] flex-col overflow-hidden rounded-[28px] xl:w-[420px]"
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-6">
        {children}
      </div>
    </motion.section>
  );
}

function useViewportHeight() {
  const [height, setHeight] = useState(() =>
    typeof window === "undefined" ? 844 : window.innerHeight,
  );
  useEffect(() => {
    const update = () => setHeight(window.innerHeight);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return height;
}

/** Arkusz z trzema punktami zatrzymania. Ciągnie się za uchwyt i nagłówek, rzut wybiera punkt z rozpędu. */
function MobileSheet({
  children,
  onCoverChange,
}: {
  children: (startDrag: (event: PointerEvent) => void) => ReactNode;
  onCoverChange: (px: number) => void;
}) {
  const height = useViewportHeight();
  const detents = {
    full: 64,
    mid: Math.round(height * 0.42),
    peek: Math.max(Math.round(height * 0.42) + 40, height - 330),
  };
  const y = useMotionValue(height);
  const visibleHeight = useTransform(y, (value) => Math.max(0, height - value));
  const controls = useDragControls();
  const [detent, setDetent] = useState<keyof typeof detents>("mid");

  // Wjazd i zmiana rozmiaru okna: sprężyna do bieżącego punktu zatrzymania
  // biome-ignore lint/correctness/useExhaustiveDependencies: reagujemy na rozmiar okna i punkt zatrzymania
  useEffect(() => {
    const target = detents[detent];
    const animation = animate(y, target, SPRING);
    onCoverChange(height - target);
    return () => animation.stop();
  }, [height, detent]);

  function startDrag(event: PointerEvent) {
    controls.start(event);
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    // Cel wybieramy z miejsca, w które arkusz by doleciał, a nie z miejsca puszczenia
    const landing = y.get() + project(info.velocity.y);
    const nearest = (Object.keys(detents) as (keyof typeof detents)[]).reduce((best, key) =>
      Math.abs(detents[key] - landing) < Math.abs(detents[best] - landing) ? key : best,
    );
    if (nearest !== detent) haptic();
    setDetent(nearest);
    animate(y, detents[nearest], { ...SPRING_FLICK, velocity: info.velocity.y });
    onCoverChange(height - detents[nearest]);
  }

  return (
    <motion.section
      aria-label="Trasa"
      drag="y"
      dragControls={controls}
      dragListener={false}
      dragConstraints={{ top: detents.full, bottom: detents.peek }}
      dragElastic={0.12}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      exit={{ y: height }}
      transition={SPRING}
      style={{ y }}
      className="karta absolute inset-x-0 top-0 z-20 h-dvh rounded-t-[28px] border-b-0"
    >
      <div
        onPointerDown={startDrag}
        className="flex cursor-grab touch-none justify-center pb-2 pt-2.5 active:cursor-grabbing"
      >
        <button
          type="button"
          aria-label="Rozwiń lub zwiń trasę"
          onClick={() => setDetent((current) => (current === "full" ? "mid" : "full"))}
          className="flex h-6 w-16 items-center justify-center"
        >
          <span className="h-[5px] w-9 rounded-full bg-tekst/20" />
        </button>
      </div>
      <motion.div
        style={{ height: visibleHeight }}
        className="overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        {children(startDrag)}
      </motion.div>
    </motion.section>
  );
}

type SheetContentProps = RouteSheetProps & {
  isPlaying: boolean;
  progress: number;
  direction: number;
  goTo: (index: number) => void;
  togglePlay: () => void;
  // Telefon: nagłówek też ciągnie arkusz
  onHeaderPointerDown?: (event: PointerEvent) => void;
};

function SheetContent({
  durationMin,
  stops,
  activeIndex,
  onBack,
  isDesktop,
  isPlaying,
  progress,
  direction,
  goTo,
  togglePlay,
  onHeaderPointerDown,
}: SheetContentProps) {
  const activeStop = stops[activeIndex];
  const lines = [...new Set(stops.map((stop) => stop.line))];

  return (
    <div className="flex flex-col gap-5">
      <header
        onPointerDown={onHeaderPointerDown}
        className={`flex items-start justify-between gap-3 ${onHeaderPointerDown ? "touch-none" : ""}`}
      >
        <div className="min-w-0">
          {isDesktop && <Logo className="mb-4 block text-[28px]" />}
          <h2 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] md:text-[26px]">
            Twoja przejażdżka
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-tekst-2">
            <span className="font-semibold text-tekst">{formatDuration(durationMin)}</span>·
            <span>{stops.length} opowieści</span>·
            <span className="inline-flex items-center gap-1">
              <TramIcon className="size-4" /> {lines.join(", ")}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className={`flex h-10 shrink-0 items-center gap-1 rounded-full bg-tlo-2 pl-2.5 pr-3.5 text-sm font-bold text-tekst transition-[transform,background-color] hover:bg-mieta-jasna active:scale-[0.96] ${isDesktop ? "mt-12" : ""}`}
        >
          <ChevronLeftIcon className="size-4" />
          Zmień plan
        </button>
      </header>

      {activeStop && (
        <StoryCard
          stop={activeStop}
          index={activeIndex}
          total={stops.length}
          direction={direction}
          isPlaying={isPlaying}
          progress={progress}
          onPrev={() => goTo(activeIndex - 1)}
          onNext={() => goTo(activeIndex + 1)}
          onTogglePlay={togglePlay}
        />
      )}

      <section aria-label="Punkty trasy">
        <p className="etykieta mb-2">Po drodze</p>
        <ol className="relative">
          {/* Linia osi czasu */}
          <span
            aria-hidden="true"
            className="absolute bottom-6 left-[27px] top-6 w-0.5 rounded-full bg-tekst/10"
          />
          {stops.map((stop, index) => {
            const isActive = index === activeIndex;
            const isDone = index < activeIndex;
            return (
              <li key={stop.id} className="relative">
                <button
                  type="button"
                  aria-current={isActive ? "step" : undefined}
                  onClick={() => goTo(index)}
                  className="relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors duration-200 hover:bg-tlo-2 active:bg-tlo-2"
                >
                  {isActive && (
                    <motion.span
                      layoutId="punkt-aktywny"
                      transition={SPRING}
                      className="absolute inset-0 rounded-2xl bg-mieta-jasna"
                    />
                  )}
                  <span
                    className={`relative flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-white text-[13px] font-extrabold transition-colors duration-300 ${
                      isActive
                        ? "bg-glebia text-white"
                        : isDone
                          ? "bg-mieta text-glebia-ciemna"
                          : "bg-koral text-white"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="relative min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold">{stop.name}</span>
                    <span className="block text-xs text-tekst-3">
                      linia {stop.line} · po ok. {stop.etaMin} min
                    </span>
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
