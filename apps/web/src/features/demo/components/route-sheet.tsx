"use client";

import type { Leg } from "@sawa/shared";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { type ReactNode, type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/features/i18n";
import { haptic, project, SPRING, SPRING_FLICK } from "../lib/device";
import { rubberband, useVerticalDrag } from "../lib/gesture";
import type { MockStop } from "../lib/mock-data";
import { backTarget } from "../lib/podcast";
import { dueIndex as placeAt, type RideClock, storyStartSec } from "../lib/ride-clock";
import type { StoryPlayer } from "../lib/story-player";
import { RoutesIcon } from "./icons";
import { PodcastControls } from "./podcast-controls";
import { RouteLive } from "./route-live";

type RouteSheetProps = {
  durationMin: number;
  /** Koniec trasy (pętla albo cel); null przy trasie „przed siebie”. */
  end: { label: string; reached: boolean } | null;
  /** Odcinki trasy z planera: tramwaje, autobusy i spacery. */
  legs: Leg[];
  /** Podpis źródeł danych trasy. */
  attribution: string[];
  stops: MockStop[];
  /** Odtwarzacz opowieści jest w `DemoApp`, bo zakładka Sawa steruje tą samą opowieścią. */
  player: StoryPlayer;
  activeIndex: number;
  onActiveChange: (index: number) => void;
  /** Przejście do miejsca z przycisków: zegar jazdy staje przy nim, opowieść gra od początku. */
  onPlayStop: (index: number) => void;
  /** Zegar jazdy: który punkt już powinien mieć opowieść, ile trwa jazda i przeskok suwakiem. */
  clock: Pick<RideClock, "dueIndex" | "waitSec" | "rideSec" | "seekTo">;
  /** Długość przejażdżki z planera (s), zakres suwaka. */
  totalSec: number;
  onBack: () => void;
  isDesktop: boolean;
  /** Ile pikseli od dołu zasłania arkusz (telefon), żeby mapa wiedziała, gdzie jest jej widoczna część. */
  onCoverChange: (px: number) => void;
};

/** Trasa: arkusz z punktami zatrzymania na telefonie, pływający panel na desktopie. */
export function RouteSheet(props: RouteSheetProps) {
  const { stops, activeIndex, onActiveChange, onPlayStop, player, clock } = props;
  const { setIsPlaying, rewind, restart, more } = player;
  const hasNext = activeIndex < stops.length - 1;
  const { progress, toggle: togglePlay } = player;
  const { seekTo } = clock;

  // Po końcu opowieści Sawa czeka, aż zbliżysz się do następnego punktu (zegar jazdy, do czasu
  // lokalizacji). Gdy opowieść się przeciągnęła, od razu bierze punkt, przy którym już jesteś.
  const { dueIndex } = clock;
  useEffect(() => {
    if (progress < 100) return;
    if (!hasNext) {
      setIsPlaying(false);
      return;
    }
    if (dueIndex <= activeIndex) return;
    rewind();
    setIsPlaying(true);
    onActiveChange(dueIndex);
  }, [progress, hasNext, activeIndex, dueIndex, onActiveChange, setIsPlaying, rewind]);

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

  // Wstecz: w trakcie opowieści od jej początku, na samym początku do poprzedniego miejsca.
  const goBack = useCallback(() => {
    const target = backTarget(activeIndex, progress);
    if (target === activeIndex) restart(true);
    else onPlayStop(target);
  }, [activeIndex, progress, restart, onPlayStop]);
  const goNext = useCallback(() => {
    if (hasNext) onPlayStop(activeIndex + 1);
  }, [hasNext, activeIndex, onPlayStop]);
  // Suwak przesuwa zegar jazdy; inne miejsce pod suwakiem znaczy nową opowieść od początku.
  const seek = useCallback(
    (sec: number) => {
      seekTo(sec);
      const index = placeAt(stops, sec);
      if (index === activeIndex) return;
      rewind();
      setIsPlaying(true);
      onActiveChange(index);
    },
    [seekTo, stops, activeIndex, rewind, setIsPlaying, onActiveChange],
  );

  // Klawiatura na desktopie: spacja wstrzymuje, strzałki przechodzą między miejscami.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, button, [contenteditable]")) return;
      if (event.key === " ") {
        event.preventDefault();
        togglePlay();
      } else if (event.key === "ArrowLeft") {
        goBack();
      } else if (event.key === "ArrowRight") {
        goNext();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, goBack, goNext]);

  // Suwak obejmuje całą jazdę, a co najmniej start ostatniej opowieści
  const last = stops[stops.length - 1];
  const totalSec = Math.max(props.totalSec, last ? storyStartSec(last) + 60 : 0);
  const controlsRef = useRef<HTMLDivElement>(null);

  const content = (
    <RouteLive
      {...props}
      isPlaying={player.isPlaying}
      progress={progress}
      waitSec={clock.waitSec}
      storyText={player.text}
      transcript={transcript}
      storyState={player.loading ? "loading" : player.failed ? "failed" : "ready"}
      controls={
        <div ref={controlsRef} className="pb-[env(safe-area-inset-bottom)]">
          <PodcastControls
            stops={stops}
            activeIndex={activeIndex}
            rideSec={clock.rideSec}
            totalSec={totalSec}
            isPlaying={player.isPlaying}
            waiting={clock.waitSec !== null}
            loading={player.loading}
            onToggle={togglePlay}
            onStop={() => restart(false)}
            onBack={goBack}
            onNext={goNext}
            onMore={more}
            onSeek={seek}
            onLeave={props.onBack}
          />
        </div>
      }
    />
  );

  return props.isDesktop ? (
    <DesktopPanel>{content}</DesktopPanel>
  ) : (
    <MobileSheet onCoverChange={props.onCoverChange} controlsRef={controlsRef}>
      {content}
    </MobileSheet>
  );
}

function DesktopPanel({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <motion.section
      aria-label={t("Trasa", "Route")}
      initial={{ opacity: 0, x: -32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -32 }}
      transition={SPRING}
      style={{ ["--trasa-widoczne" as string]: "calc(100dvh - 100px)" }}
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

/** Ile pikseli od dołu zajmuje przycisk „Trasa”, gdy arkusz jest schowany (mapa ma wtedy wolny cały ekran). */
const HIDDEN_COVER_PX = 96;
// Odstęp pod sterowaniem w zwiniętym arkuszu; pasek domowy iPhone'a dokłada safe area w samym sterowaniu
const CONTROLS_GAP_PX = 8;

/**
 * Arkusz z dwoma punktami zatrzymania: zwinięty pokazuje tylko sterowanie opowieścią (reszta
 * ekranu to mapa), rozwinięty także zapis Sawy. Schowany zostaje tylko przycisk w prawym dolnym rogu.
 * Ciągnie się za każde miejsce, rzut wybiera punkt z rozpędu, ściągnięcie w dół chowa arkusz.
 */
function MobileSheet({
  children,
  onCoverChange,
  controlsRef,
}: {
  children: ReactNode;
  onCoverChange: (px: number) => void;
  /** Sterowanie na górze treści: zwinięty arkusz kończy się tuż pod nim. */
  controlsRef: RefObject<HTMLDivElement | null>;
}) {
  const t = useT();
  const reduce = useReducedMotion();
  const height = useViewportHeight();
  // Dół sterowania od góry arkusza (px); mierzony, bo zależy od czcionek i długości nazw
  const [controlsBottom, setControlsBottom] = useState(300);
  useEffect(() => {
    const el = controlsRef.current;
    if (!el) return;
    const update = () => setControlsBottom(el.offsetTop + el.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [controlsRef]);
  const detents = {
    full: 64,
    controls: Math.max(Math.round(height * 0.35), height - controlsBottom - CONTROLS_GAP_PX),
  };
  const y = useMotionValue(height);
  const [detent, setDetent] = useState<keyof typeof detents>("controls");
  const [isHidden, setIsHidden] = useState(true);
  const sheetRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const base = useRef(0);
  const isFull = detent === "full";

  // Schowany arkusz zjeżdża za dół ekranu, otwarty staje na swoim punkcie zatrzymania
  // biome-ignore lint/correctness/useExhaustiveDependencies: reagujemy na rozmiar okna, punkt zatrzymania i schowanie
  useEffect(() => {
    const target = isHidden ? height : detents[detent];
    const animation = animate(y, target, reduce ? { duration: 0 } : SPRING);
    onCoverChange(isHidden ? HIDDEN_COVER_PX : height - detents[detent]);
    return () => animation.stop();
  }, [height, detent, isHidden, controlsBottom]);

  // Poza pełnym rozmiarem treść się nie przewija, tylko ciągnie arkusz. Wracamy wtedy na górę listy.
  useEffect(() => {
    if (!isFull) scrollRef.current?.scrollTo({ top: 0 });
  }, [isFull]);

  useVerticalDrag(sheetRef, {
    // W pełnym rozmiarze arkusz przejmuje gest tylko, gdy lista jest na górze i palec idzie w dół (jak w iOS).
    shouldStart: (dy) =>
      !isHidden && (!isFull || (dy > 0 && (scrollRef.current?.scrollTop ?? 0) <= 0)),
    onStart: () => {
      y.stop();
      base.current = y.get();
    },
    onMove: (dy) => {
      const raw = base.current + dy;
      // W górę opór za pełnym rozmiarem, w dół 1:1, bo tam arkusz się chowa
      y.set(raw < detents.full ? detents.full - rubberband(detents.full - raw, height) : raw);
    },
    onEnd: (velocity) => {
      // Cel wybieramy z miejsca, w które arkusz by doleciał, a nie z miejsca puszczenia
      const landing = y.get() + project(velocity);
      if (landing > detents.controls + (height - detents.controls) * 0.5 && velocity >= 0) {
        haptic();
        setIsHidden(true);
        animate(y, height, reduce ? { duration: 0 } : { ...SPRING_FLICK, velocity });
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

  function show() {
    haptic();
    setDetent("controls");
    setIsHidden(false);
  }

  return (
    <>
      <motion.section
        ref={sheetRef}
        aria-label={t("Trasa", "Route")}
        aria-hidden={isHidden}
        inert={isHidden}
        exit={reduce ? { opacity: 0 } : { y: height }}
        transition={SPRING}
        // Widoczna część arkusza przy punkcie zatrzymania: zapis Sawy dopasowuje do niej wysokość
        style={{ y, ["--trasa-widoczne" as string]: `${height - detents[detent]}px` }}
        className={`karta absolute inset-x-0 top-0 z-20 flex h-dvh flex-col rounded-t-[28px] border-b-0 ${
          isFull ? "" : "touch-none"
        }`}
      >
        <div className="flex shrink-0 cursor-grab justify-center pb-2 pt-2.5 active:cursor-grabbing">
          <button
            type="button"
            aria-label={
              isFull
                ? t("Pokaż tylko sterowanie", "Show controls only")
                : t("Pokaż zapis opowieści", "Show the story transcript")
            }
            onClick={() => {
              haptic();
              setDetent((current) => (current === "full" ? "controls" : "full"));
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

      <motion.button
        type="button"
        aria-label={t("Pokaż trasę", "Show route")}
        onClick={show}
        inert={!isHidden}
        initial={false}
        animate={{ opacity: isHidden ? 1 : 0, scale: isHidden ? 1 : 0.8 }}
        transition={reduce ? { duration: 0 } : SPRING}
        className={`absolute right-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-20 grid size-14 place-items-center rounded-full bg-glebia text-white shadow-[0_8px_20px_rgba(23,112,111,0.35)] transition-transform duration-150 active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-glebia ${
          isHidden ? "" : "pointer-events-none"
        }`}
      >
        <RoutesIcon className="size-6" />
      </motion.button>
    </>
  );
}
