"use client";

import type { Interest } from "@sawa/shared";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { haptic, project, SPRING, SPRING_FLICK } from "../lib/device";
import { formatDuration } from "../lib/format";
import { rubberband, useVerticalDrag } from "../lib/gesture";
import type { MockStop } from "../lib/mock-data";
import { useStoryPlayer } from "../lib/story-player";
import { ChevronLeftIcon, PinIcon, TramIcon } from "./icons";
import { Logo } from "./logo";
import { StoryCard } from "./story-card";

type RouteSheetProps = {
  durationMin: number;
  /** Koniec trasy (pętla albo cel); null przy trasie „przed siebie”. */
  end: { label: string; reached: boolean } | null;
  stops: MockStop[];
  /** Kategorie z onboardingu: Sawa opowiada pod nie. */
  interests: Interest[];
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
  const { setIsPlaying, rewind, ...player } = useStoryPlayer(stops, activeIndex, props.interests);
  const [direction, setDirection] = useState(1);
  const hasNext = activeIndex < stops.length - 1;
  const { progress, toggle: togglePlay } = player;

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= stops.length || index === activeIndex) return;
      setDirection(index > activeIndex ? 1 : -1);
      rewind();
      setIsPlaying(true);
      onActiveChange(index);
    },
    [activeIndex, stops.length, onActiveChange, setIsPlaying, rewind],
  );

  // Po końcu opowieści Sawa przechodzi do następnego punktu
  useEffect(() => {
    if (progress < 100) return;
    if (hasNext) goTo(activeIndex + 1);
    else setIsPlaying(false);
  }, [progress, hasNext, activeIndex, goTo, setIsPlaying]);

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

  const content = (
    <SheetContent
      {...props}
      isPlaying={player.isPlaying}
      progress={progress}
      storyText={player.text}
      storyState={player.loading ? "loading" : player.failed ? "failed" : "ready"}
      direction={direction}
      goTo={goTo}
      togglePlay={togglePlay}
    />
  );

  return props.isDesktop ? (
    <DesktopPanel>{content}</DesktopPanel>
  ) : (
    <MobileSheet onCoverChange={props.onCoverChange} onDismiss={props.onBack}>
      {content}
    </MobileSheet>
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
      className="karta absolute bottom-6 left-6 top-6 z-20 flex w-[360px] flex-col overflow-hidden rounded-[28px] lg:w-[400px]"
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

/** Arkusz z trzema punktami zatrzymania. Ciągnie się za każde miejsce, rzut wybiera punkt z rozpędu, ściągnięcie w dół zamyka. */
function MobileSheet({
  children,
  onCoverChange,
  onDismiss,
}: {
  children: ReactNode;
  onCoverChange: (px: number) => void;
  onDismiss: () => void;
}) {
  const reduce = useReducedMotion();
  const height = useViewportHeight();
  const detents = {
    full: 64,
    mid: Math.round(height * 0.42),
    peek: Math.max(Math.round(height * 0.42) + 40, height - 330),
  };
  const y = useMotionValue(height);
  const [detent, setDetent] = useState<keyof typeof detents>("mid");
  const sheetRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const base = useRef(0);
  const isFull = detent === "full";

  // Wjazd i zmiana rozmiaru okna: sprężyna do bieżącego punktu zatrzymania
  // biome-ignore lint/correctness/useExhaustiveDependencies: reagujemy na rozmiar okna i punkt zatrzymania
  useEffect(() => {
    const target = detents[detent];
    const animation = animate(y, target, reduce ? { duration: 0 } : SPRING);
    onCoverChange(height - target);
    return () => animation.stop();
  }, [height, detent]);

  // Poza pełnym rozmiarem treść się nie przewija, tylko ciągnie arkusz. Wracamy wtedy na górę listy.
  useEffect(() => {
    if (!isFull) scrollRef.current?.scrollTo({ top: 0 });
  }, [isFull]);

  useVerticalDrag(sheetRef, {
    // W pełnym rozmiarze arkusz przejmuje gest tylko, gdy lista jest na górze i palec idzie w dół (jak w iOS).
    shouldStart: (dy) => !isFull || (dy > 0 && (scrollRef.current?.scrollTop ?? 0) <= 0),
    onStart: () => {
      y.stop();
      base.current = y.get();
    },
    onMove: (dy) => {
      const raw = base.current + dy;
      // W górę opór za pełnym rozmiarem, w dół 1:1, bo tam arkusz się zamyka
      y.set(raw < detents.full ? detents.full - rubberband(detents.full - raw, height) : raw);
    },
    onEnd: (velocity) => {
      // Cel wybieramy z miejsca, w które arkusz by doleciał, a nie z miejsca puszczenia
      const landing = y.get() + project(velocity);
      if (landing > detents.peek + (height - detents.peek) * 0.5 && velocity >= 0) {
        haptic();
        onDismiss();
        return;
      }
      const nearest = (Object.keys(detents) as (keyof typeof detents)[]).reduce((best, key) =>
        Math.abs(detents[key] - landing) < Math.abs(detents[best] - landing) ? key : best,
      );
      if (nearest !== detent) haptic();
      setDetent(nearest);
      animate(y, detents[nearest], reduce ? { duration: 0 } : { ...SPRING_FLICK, velocity });
      onCoverChange(height - detents[nearest]);
    },
  });

  return (
    <motion.section
      ref={sheetRef}
      aria-label="Trasa"
      exit={reduce ? { opacity: 0 } : { y: height }}
      transition={SPRING}
      style={{ y }}
      className={`karta absolute inset-x-0 top-0 z-20 flex h-dvh flex-col rounded-t-[28px] border-b-0 ${
        isFull ? "" : "touch-none"
      }`}
    >
      <div className="flex shrink-0 cursor-grab justify-center pb-2 pt-2.5 active:cursor-grabbing">
        <button
          type="button"
          aria-label={isFull ? "Zwiń trasę" : "Rozwiń trasę"}
          onClick={() => {
            haptic();
            setDetent((current) => (current === "full" ? "mid" : "full"));
          }}
          className="flex h-6 w-16 items-center justify-center"
        >
          <span className="h-[5px] w-9 rounded-full bg-tekst/20" />
        </button>
      </div>
      {/* Stała wysokość (widoczna część przy pełnym rozmiarze): arkusz jedzie transformem, bez przeliczania układu w każdej klatce */}
      <div
        ref={scrollRef}
        style={{ height: height - detents.full - 34 }}
        className={`overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] ${
          isFull ? "touch-pan-y overflow-y-auto" : "overflow-hidden"
        }`}
      >
        {children}
      </div>
    </motion.section>
  );
}

type SheetContentProps = RouteSheetProps & {
  isPlaying: boolean;
  progress: number;
  storyText: string | null;
  storyState: "loading" | "ready" | "failed";
  direction: number;
  goTo: (index: number) => void;
  togglePlay: () => void;
};

function SheetContent({
  durationMin,
  end,
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
}: SheetContentProps) {
  const activeStop = stops[activeIndex];
  const lines = [...new Set(stops.map((stop) => stop.line))];

  return (
    <div className="flex flex-col gap-5">
      <header>
        {isDesktop && <Logo className="mb-5 block text-[28px]" />}
        <div className="flex items-start justify-between gap-3">
          <h2 className="pt-1 text-[22px] font-extrabold leading-tight tracking-[-0.02em] md:text-[26px]">
            Twoja przejażdżka
          </h2>
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 shrink-0 items-center gap-1 rounded-full bg-tlo-2 pl-2.5 pr-3.5 text-sm font-bold text-tekst transition-[transform,background-color] hover:bg-mieta-jasna active:scale-[0.96]"
          >
            <ChevronLeftIcon className="size-4" />
            Zmień plan
          </button>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-tekst-2">
          <span className="font-semibold text-tekst">{formatDuration(durationMin)}</span>·
          <span>{stops.length} opowieści</span>·
          <span className="inline-flex items-center gap-1">
            <TramIcon className="size-4" /> {lines.join(", ")}
          </span>
        </p>
        {end && (
          <p
            role={end.reached ? undefined : "status"}
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold ${
              end.reached ? "bg-mieta-jasna text-glebia" : "bg-koral/15 text-tekst"
            }`}
          >
            <PinIcon className="size-4 shrink-0" />
            {end.label}
          </p>
        )}
      </header>

      {activeStop && (
        <StoryCard
          stop={activeStop}
          index={activeIndex}
          total={stops.length}
          direction={direction}
          isPlaying={isPlaying}
          progress={progress}
          text={storyText}
          state={storyState}
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
