"use client";

import type { Place } from "@sawa/shared";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useLayoutEffect, useRef } from "react";
import { PLACE_KIND_LABELS, placeKindColor } from "@/features/map";
import { haptic, project, SPRING, SPRING_FLICK } from "../lib/device";
import { rubberband, useVerticalDrag } from "../lib/gesture";
import type { PlaceStoryState } from "../lib/place-story";
import { PauseIcon, PlayIcon } from "./icons";

type PlaceCardShellProps = {
  label: string;
  onClose: () => void;
  /** Ile pikseli od dołu ekranu zasłania karta, żeby mapa trzymała miejsce nad nią. */
  onCoverChange: (px: number) => void;
  className?: string;
  children: ReactNode;
};

/**
 * Karta po dotknięciu miejsca: nad paskiem zakładek na telefonie, panel po lewej na desktopie.
 * Ściągnięcie w dół z rzutem zamyka ją; w górę opór, bo karta ma jeden rozmiar.
 */
export function PlaceCardShell({
  label,
  onClose,
  onCoverChange,
  className = "",
  children,
}: PlaceCardShellProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const base = useRef(0);
  const height = useRef(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const report = () => {
      height.current = element.offsetHeight;
      onCoverChange(Math.max(0, window.innerHeight - element.getBoundingClientRect().top));
    };
    const observer = new ResizeObserver(report);
    observer.observe(element);
    report();
    return () => observer.disconnect();
  }, [onCoverChange]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useVerticalDrag(ref, {
    // Przewinięta treść najpierw wraca na górę, dopiero potem gest ściąga kartę (jak w iOS).
    shouldStart: (dy) => dy > 0 && (scrollRef.current?.scrollTop ?? 0) <= 0,
    onStart: () => {
      y.stop();
      base.current = y.get();
    },
    onMove: (dy) => {
      const raw = base.current + dy;
      y.set(raw < 0 ? -rubberband(-raw, height.current) : raw);
    },
    onEnd: (velocity) => {
      const landing = y.get() + project(velocity);
      if (landing > height.current * 0.45 && velocity >= 0) {
        haptic();
        // Karta leci dalej z prędkością palca, a rodzic w tym czasie ją wygasza.
        animate(y, height.current + 80, reduce ? { duration: 0 } : { ...SPRING_FLICK, velocity });
        onClose();
        return;
      }
      animate(y, 0, reduce ? { duration: 0 } : { ...SPRING_FLICK, velocity });
    },
  });

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+64px)] z-20 md:bottom-0">
      <motion.section
        aria-label={label}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 56, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 56, transition: { duration: 0.22 } }}
        transition={SPRING}
        className="absolute inset-x-3 bottom-3 md:inset-x-auto md:bottom-6 md:left-6 md:w-[360px] lg:w-[400px]"
      >
        <motion.div
          ref={ref}
          style={{ y }}
          className="pointer-events-auto touch-none md:touch-auto"
        >
          <div
            ref={scrollRef}
            className={`karta relative max-h-[min(64dvh,600px)] touch-pan-y overflow-y-auto overscroll-contain md:max-h-[calc(100dvh-8rem)] ${className}`}
          >
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-2 z-10 h-[5px] w-9 -translate-x-1/2 rounded-full bg-tekst/15 md:hidden"
            />
            {children}
          </div>
        </motion.div>
      </motion.section>
    </div>
  );
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Zamknij"
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tlo-2 text-tekst-2 transition-[transform,background-color] hover:bg-mieta-jasna hover:text-tekst active:scale-[0.92]"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="currentColor">
        <path d="M5.3 4.3a1 1 0 0 0-1.4 1.4L8.6 10l-4.7 4.3a1 1 0 1 0 1.4 1.4L10 11.4l4.3 4.3a1 1 0 0 0 1.4-1.4L11.4 10l4.3-4.3a1 1 0 0 0-1.4-1.4L10 8.6 5.3 4.3Z" />
      </svg>
    </button>
  );
}

/** Rodzaj miejsca w jego kolorze z mapy i okres, np. „miejsce · 1867–1947”. */
export function KindLine({ place, className = "" }: { place: Place; className?: string }) {
  const parts = [PLACE_KIND_LABELS[place.kind], place.period].filter(Boolean);
  return (
    <p className={`etykieta flex items-center gap-2 ${className}`}>
      <span
        aria-hidden="true"
        className="inline-block size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: placeKindColor(place.kind) }}
      />
      <span className="truncate">{parts.join(" · ")}</span>
    </p>
  );
}

type ListenButtonProps = {
  state: PlaceStoryState;
  progress: number;
  onToggle: () => void;
};

/** „Posłuchaj Sawy”: tło przycisku wypełnia się w miarę opowieści, jak pasek postępu. */
export function ListenButton({ state, progress, onToggle }: ListenButtonProps) {
  const isPlaying = state === "playing";
  const label = {
    idle: "Posłuchaj Sawy",
    loading: "Sawa sobie przypomina…",
    playing: "Pauza",
    paused: progress >= 100 ? "Jeszcze raz" : "Słuchaj dalej",
    failed: "Spróbuj jeszcze raz",
  }[state];

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.97 }}
      transition={SPRING}
      aria-label={label}
      className="relative flex h-14 w-full items-center justify-center gap-2.5 overflow-hidden rounded-[18px] bg-glebia px-4 text-[16px] font-bold tracking-[-0.01em] text-white shadow-[0_6px_16px_rgba(23,112,111,0.28)] transition-colors hover:bg-glebia-ciemna"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-full origin-left bg-white/15"
        style={{ transform: `scaleX(${state === "idle" ? 0 : progress / 100})` }}
      />
      <span className={`relative shrink-0 ${state === "loading" ? "animate-pulse" : ""}`}>
        {isPlaying ? <PauseIcon className="size-5" /> : <PlayIcon className="size-5" />}
      </span>
      {/* Etykieta w jednej linii, czas pod nią: w wąskiej karcie obok „Jedź tutaj” nic się nie łamie. */}
      <span className="relative flex min-w-0 flex-col items-start leading-tight">
        <span className="max-w-full truncate whitespace-nowrap">{label}</span>
        {state === "idle" && (
          <span className="whitespace-nowrap text-[12px] font-semibold text-white/70">
            ok. 45 s
          </span>
        )}
      </span>
    </motion.button>
  );
}

/** „Kercelak (plac Kercelego, rondo Kercelak)” → tytuł „Kercelak” i podtytuł z nawiasu. */
export function splitName(name: string): { title: string; aside: string | null } {
  const match = name.match(/^(.+?)\s*\((.+)\)\s*$/);
  return match ? { title: match[1], aside: match[2] } : { title: name, aside: null };
}

/** Fakty z bazy mają na końcu źródło w nawiasie („(Wikipedia pl: Kercelak)”); w karcie źródła są osobno. */
export function cleanFact(fact: string): string {
  return fact.replace(/\s*\([^()]*\)\s*$/, "");
}

export function Sources({ place }: { place: Place }) {
  if (place.sources.length === 0) return null;
  return (
    <div>
      <h3 className="etykieta">Źródła</h3>
      <ul className="mt-1.5 space-y-1 text-[13px]">
        {place.sources.map((source) => (
          <li key={source.id}>
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="break-words text-tekst-2 underline decoration-tekst-3/50 underline-offset-2 hover:text-tekst"
            >
              {source.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TodayNearby({ place }: { place: Place }) {
  if (place.todayNearby.length === 0) return null;
  return (
    <div>
      <h3 className="etykieta">Dziś w tym miejscu</h3>
      <ul className="mt-1.5 divide-y divide-tlo-2">
        {place.todayNearby.slice(0, 4).map((item) => (
          <li key={item.placeId}>
            <a
              href={item.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-baseline justify-between gap-3 py-2 text-[14px]"
            >
              <span className="min-w-0 truncate font-semibold text-tekst">{item.name}</span>
              {item.type && <span className="shrink-0 text-xs text-tekst-3">{item.type}</span>}
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[11px] text-tekst-3">Dane: Google Maps</p>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-3 p-5 pt-6">
      <div className="h-3 w-1/3 animate-pulse rounded bg-tlo-2" />
      <div className="h-6 w-4/5 animate-pulse rounded bg-tlo-2" />
      <div className="aspect-[16/9] w-full animate-pulse rounded-2xl bg-tlo-2" />
      <div className="h-3 w-full animate-pulse rounded bg-tlo-2" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-tlo-2" />
    </div>
  );
}
