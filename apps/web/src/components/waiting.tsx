"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";

/*
 * Wspólne klocki czekania: spinner jak w iOS, szkielet z połyskiem, pigułka statusu nad mapą
 * i komunikat, który zmienia się, im dłużej czekamy. Krótkie czekanie (poniżej ok. 0,4 s)
 * niczego nie pokazuje, żeby ekran nie mrugał.
 */

const SPOKES = 8;

/**
 * Spinner aktywności jak w iOS: osiem kresek, jasność obiega w kółko. Kolor bierze z `currentColor`.
 * Sam nic nie mówi czytnikowi ekranu: obok zawsze stoi tekst, co się dzieje.
 */
export function Spinner({ className = "size-4" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`spinner relative inline-block shrink-0 ${className}`}>
      {Array.from({ length: SPOKES }, (_, index) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: stała liczba kresek
          key={index}
          className="absolute left-[43.75%] top-0 h-[30%] w-[12.5%] rounded-full bg-current"
          style={{
            transform: `rotate(${(index * 360) / SPOKES}deg)`,
            transformOrigin: "50% 166%",
            animationDelay: `${((index - SPOKES) * 1000) / SPOKES}ms`,
          }}
        />
      ))}
    </span>
  );
}

/** Szary klocek w miejscu treści, która się ładuje; połysk przechodzi przez niego co chwilę. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`szkielet block rounded-md ${className}`} />;
}

/** Kilka linijek tekstu w budowie: ostatnia krótsza, jak koniec akapitu. */
export function SkeletonLines({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <span aria-hidden="true" className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          // biome-ignore lint/suspicious/noArrayIndexKey: stała liczba linijek
          key={index}
          className={`h-3 ${index === lines - 1 ? "w-3/5" : "w-full"}`}
        />
      ))}
    </span>
  );
}

/**
 * Zdjęcie z archiwum: póki się ściąga, w jego miejscu jest szkielet z połyskiem, potem zdjęcie
 * łagodnie się pojawia. Zepsuty adres zostawia spokojne, szare pole zamiast ikony błędu.
 */
export function FadeImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const ref = (img: HTMLImageElement | null) => {
    // Zdjęcie z pamięci podręcznej bywa gotowe przed podpięciem onLoad
    if (img?.complete && img.naturalWidth > 0 && state === "loading") setState("ready");
  };
  return (
    <span className={`relative block overflow-hidden ${className}`}>
      {state !== "ready" && (
        <span
          aria-hidden="true"
          className={`absolute inset-0 ${state === "loading" ? "szkielet" : "bg-tlo-2"}`}
        />
      )}
      {/* biome-ignore lint/performance/noImgElement: zdjęcia z wielu archiwów, next/image wymagałby każdej domeny w konfiguracji */}
      <img
        ref={ref}
        src={src}
        alt={alt}
        loading="lazy"
        draggable={false}
        onLoad={() => setState("ready")}
        onError={() => setState("failed")}
        className={`size-full object-cover transition-opacity duration-500 ease-out ${
          state === "ready" ? "opacity-100" : "opacity-0"
        }`}
      />
    </span>
  );
}

/** Prawda dopiero, gdy `active` trwa dłużej niż `delayMs`: szybka odpowiedź nie mignie spinnerem. */
export function useDelayed(active: boolean, delayMs = 400): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!active) {
      setShown(false);
      return;
    }
    const id = window.setTimeout(() => setShown(true), delayMs);
    return () => window.clearTimeout(id);
  }, [active, delayMs]);
  return shown;
}

/** Krok komunikatu: od której sekundy czekania się pokazuje. */
export type WaitStep = { afterSec: number; text: string };

/**
 * Komunikat do długiego czekania: co kilka sekund mówi, co się dzieje, a po dłuższej chwili
 * uczciwie przyznaje, że trwa dłużej niż zwykle. Liczy od nowa przy każdym starcie czekania.
 */
export function useWaitMessage(active: boolean, steps: readonly WaitStep[]): string | null {
  const [elapsedSec, setElapsedSec] = useState(0);
  useEffect(() => {
    setElapsedSec(0);
    if (!active) return;
    const started = performance.now();
    const id = window.setInterval(
      () => setElapsedSec(Math.floor((performance.now() - started) / 1000)),
      500,
    );
    return () => window.clearInterval(id);
  }, [active]);
  return active ? waitStepText(steps, elapsedSec) : null;
}

/** Ostatni krok, którego czas już minął; przed pierwszym progiem pierwszy krok. */
export function waitStepText(steps: readonly WaitStep[], elapsedSec: number): string | null {
  let text = steps[0]?.text ?? null;
  for (const step of steps) if (elapsedSec >= step.afterSec) text = step.text;
  return text;
}

/** Tekst, który przy zmianie przewija się w górę (jak licznik), zamiast przeskakiwać. */
export function RollingText({ text, className = "" }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className={`relative inline-grid min-w-0 overflow-hidden ${className}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={text}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: "0.7em" }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: "-0.7em" }}
          transition={{ type: "spring", bounce: 0, duration: 0.35 }}
          className="truncate"
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Zasłona na czas startu mapy: tło mapy i spinner z podpisem na środku, znika płynnie. */
export function LoadingCover({ show, label }: { show: boolean; label: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="zaslona"
          role="status"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none absolute inset-0 z-[5] flex items-start justify-center bg-mapa pt-[30vh]"
        >
          <span className="flex items-center gap-2 text-[13px] font-semibold text-tekst-3">
            <Spinner className="size-4" />
            {label}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Szklana pigułka u góry ekranu: co dzieje się w tle (mapa, lokalizacja, miejsca).
 * Wjeżdża z góry, a znika, gdy `children` jest puste. Czytnik ekranu dostaje to jako status.
 */
export function StatusPill({
  children,
  icon,
  action,
  className = "",
}: {
  children: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {children && (
        <motion.div
          key="pigulka"
          role="status"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.96 }}
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
          className={`szklo pointer-events-auto flex h-9 max-w-[min(64vw,26rem)] items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold text-tekst-2 ${className}`}
        >
          {icon ?? <Spinner className="size-3.5 text-glebia" />}
          <span className="min-w-0 truncate">{children}</span>
          {action}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
