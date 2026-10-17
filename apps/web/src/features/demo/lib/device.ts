"use client";

import { useSyncExternalStore } from "react";

function useMediaQuery(query: string, serverValue: boolean): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** Szeroki ekran: panel boczny zamiast arkusza (ten sam próg co `md:` w Tailwindzie). */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 768px)", false);
}

/** Laptop i szerzej: pełna szerokość panelu (próg `lg:`). */
export function useIsWide(): boolean {
  return useMediaQuery("(min-width: 1024px)", false);
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)", false);
}

/** Krótka wibracja przy zatrzaśnięciu (Android; iOS Safari ignoruje). */
export function haptic(ms = 8) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
}

/**
 * Gdzie zatrzymałby się rzucony element (funkcja z „Designing Fluid Interfaces”, WWDC 2018).
 * Velocity w px/s, wynik w px.
 */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Domyślna sprężyna UI: krytycznie tłumiona, bez przestrzelenia. */
export const SPRING = { type: "spring", bounce: 0, duration: 0.45 } as const;

/** Sprężyna po rzucie palcem: lekkie odbicie, bo gest niósł pęd. */
export const SPRING_FLICK = { type: "spring", bounce: 0.18, duration: 0.5 } as const;
