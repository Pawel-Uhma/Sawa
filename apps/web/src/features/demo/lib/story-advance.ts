"use client";

import { useSyncExternalStore } from "react";

/*
 * Jak Sawa przechodzi między miejscami trasy (menu Sawy, „Prowadzenie”):
 * - automatycznie: po końcu opowieści bierze miejsce, do którego dojechałeś (zegar jazdy, GPS),
 * - ręcznie: po końcu opowieści czeka (muzyka gra dalej); dalej prowadzą tylko Wstecz, Następne
 *   i lista punktów.
 * W obu trybach ręczne przeklikiwanie działa tak samo.
 */

export const AUTO_ADVANCE_STORAGE_KEY = "sawa-prowadzenie";

/** Domyślnie automatycznie; zapisujemy tylko wybór „ręcznie”. */
export function parseAutoAdvance(value: unknown): boolean {
  return value !== "manual";
}

/**
 * Co zrobić, gdy opowieść się skończyła (`progress` 100): `stop` (koniec trasy, Sawa staje
 * razem z muzyką), `wait` (czeka na następne miejsce: z zegara jazdy albo GPS, a ręcznie na
 * Następne; muzyka gra dalej) albo indeks miejsca, o którym mówić dalej.
 */
export function afterStory({
  activeIndex,
  dueIndex,
  stopCount,
  auto,
}: {
  activeIndex: number;
  dueIndex: number;
  stopCount: number;
  auto: boolean;
}): "stop" | "wait" | number {
  if (activeIndex >= stopCount - 1) return "stop";
  return auto && dueIndex > activeIndex ? dueIndex : "wait";
}

// Wybór słuchacza na tym urządzeniu, jak muzyka w tle (ride-music-player.ts)
const listeners = new Set<() => void>();
/** Wybór z tej sesji, gdy magazyn jest zablokowany (prywatny tryb). */
let chosen: boolean | null = null;

function readAutoAdvance(): boolean {
  if (chosen !== null) return chosen;
  try {
    return parseAutoAdvance(window.localStorage.getItem(AUTO_ADVANCE_STORAGE_KEY));
  } catch {
    return true;
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Wybór z innej karty: inaczej muzyka grała dalej w karcie otwartej wcześniej
  const onStorage = (event: StorageEvent) => {
    if (event.key !== AUTO_ADVANCE_STORAGE_KEY && event.key !== null) return;
    chosen = null;
    onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function setAutoAdvance(on: boolean) {
  chosen = on;
  try {
    if (on) window.localStorage.removeItem(AUTO_ADVANCE_STORAGE_KEY);
    else window.localStorage.setItem(AUTO_ADVANCE_STORAGE_KEY, "manual");
  } catch {
    // Prywatny tryb albo zablokowany magazyn: wybór działa do przeładowania strony (`chosen`).
  }
  for (const listener of listeners) listener();
}

export function useAutoAdvance(): boolean {
  return useSyncExternalStore(subscribe, readAutoAdvance, () => true);
}
