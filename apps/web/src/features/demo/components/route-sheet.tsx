"use client";

import type { Leg } from "@sawa/shared";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { haptic, project, SPRING, SPRING_FLICK } from "../lib/device";
import { rubberband, useVerticalDrag } from "../lib/gesture";
import type { MockStop } from "../lib/mock-data";
import type { StoryPlayer } from "../lib/story-player";
import {
  ROUTE_VARIANTS,
  type RouteVariant,
  RouteVariantSwitch,
  RouteViewChapters,
  RouteViewItinerary,
  RouteViewLive,
  type RouteViewProps,
} from "./route-variants";

type RouteSheetProps = {
  durationMin: number;
  /** Koniec trasy (pętla albo cel); null przy trasie „przed siebie”. */
  end: { label: string; reached: boolean } | null;
  /** Odcinki trasy z planera: tramwaje, autobusy i spacery. */
  legs: Leg[];
  stops: MockStop[];
  /** Odtwarzacz opowieści jest w `DemoApp`, bo zakładka Sawa steruje tą samą opowieścią. */
  player: StoryPlayer;
  activeIndex: number;
  onActiveChange: (index: number) => void;
  onBack: () => void;
  isDesktop: boolean;
  /** Ile pikseli od dołu zasłania arkusz (telefon), żeby mapa wiedziała, gdzie jest jej widoczna część. */
  onCoverChange: (px: number) => void;
};

/** Trasa: arkusz z punktami zatrzymania na telefonie, pływający panel na desktopie. */
export function RouteSheet(props: RouteSheetProps) {
  const { stops, activeIndex, onActiveChange, player } = props;
  const { setIsPlaying, rewind } = player;
  const hasNext = activeIndex < stops.length - 1;
  const { progress, toggle: togglePlay } = player;

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= stops.length || index === activeIndex) return;
      rewind();
      setIsPlaying(true);
      onActiveChange(index);
    },
    [activeIndex, stops.length, onActiveChange, setIsPlaying, rewind],
  );

  // Po końcu opowieści Sawa przechodzi do następnego punktu. Zastępstwo lokalizacji do czasu T-106.
  useEffect(() => {
    if (progress < 100) return;
    if (hasNext) goTo(activeIndex + 1);
    else setIsPlaying(false);
  }, [progress, hasNext, activeIndex, goTo, setIsPlaying]);

  // Wszystko, co Sawa powiedziała w tej jeździe, jako jeden ciągły tekst z podziałem na tematy.
  // Docelowo (T-106) to jeden strumień z pomostami od Sawy; dziś składamy go z kolejnych opowieści.
  const [said, setSaid] = useState<Record<string, string>>({});
  const activeId = stops[activeIndex]?.id;
  useEffect(() => {
    if (activeId && player.text) setSaid((prev) => ({ ...prev, [activeId]: player.text ?? "" }));
  }, [activeId, player.text]);
  const transcript = stops.flatMap((stop, index) =>
    said[stop.id] && index <= activeIndex ? [{ stopIndex: index, text: said[stop.id] }] : [],
  );

  // Klawiatura na desktopie: spacja wstrzymuje. Strzałek nie ma, bo temat wybiera lokalizacja.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, button, [contenteditable]")) return;
      if (event.key === " ") {
        event.preventDefault();
        togglePlay();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay]);

  const content = (
    <SheetContent
      {...props}
      isPlaying={player.isPlaying}
      progress={progress}
      storyText={player.text}
      transcript={transcript}
      storyState={player.loading ? "loading" : player.failed ? "failed" : "ready"}
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

/** Propozycja z `?trasa=a|b|c`; zmiana zapisuje się w adresie, żeby link pokazywał ten sam wariant. */
function useRouteVariant() {
  const [variant, setVariant] = useState<RouteVariant>(() => {
    if (typeof window === "undefined") return "a";
    const fromUrl = new URLSearchParams(window.location.search).get("trasa");
    return ROUTE_VARIANTS.find((v) => v === fromUrl) ?? "a";
  });
  const change = useCallback((next: RouteVariant) => {
    setVariant(next);
    const url = new URL(window.location.href);
    url.searchParams.set("trasa", next);
    window.history.replaceState(window.history.state, "", url);
  }, []);
  return [variant, change] as const;
}

function SheetContent(props: RouteViewProps) {
  const [variant, setVariant] = useRouteVariant();
  const View =
    variant === "a" ? RouteViewLive : variant === "b" ? RouteViewItinerary : RouteViewChapters;
  return (
    <div className="flex flex-col gap-4">
      <RouteVariantSwitch value={variant} onChange={setVariant} />
      <View {...props} />
    </div>
  );
}
