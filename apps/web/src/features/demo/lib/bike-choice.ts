"use client";

import type { Bike } from "@sawa/shared";
import { useSyncExternalStore } from "react";

/*
 * Rowerem: własny czy Veturilo (ekran główny, pod „Jak jedziesz”). Veturilo jak dotąd: planer
 * bierze rower ze stacji, gdy jest blisko, a bez stacji jedzie się własnym.
 */

export const BIKE_STORAGE_KEY = "sawa-rower";

/** Domyślnie Veturilo; zapisujemy tylko wybór własnego roweru. */
export function parseBike(value: unknown): Bike {
  return value === "own" ? "own" : "veturilo";
}

// Wybór na tym urządzeniu, jak muzyka w tle (ride-music-player.ts)
const listeners = new Set<() => void>();
/** Wybór z tej sesji, gdy magazyn jest zablokowany (prywatny tryb). */
let chosen: Bike | null = null;

export function readBike(): Bike {
  if (chosen !== null) return chosen;
  try {
    return parseBike(window.localStorage.getItem(BIKE_STORAGE_KEY));
  } catch {
    return "veturilo";
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Wybór z innej karty
  const onStorage = (event: StorageEvent) => {
    if (event.key !== BIKE_STORAGE_KEY && event.key !== null) return;
    chosen = null;
    onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function setBike(bike: Bike) {
  chosen = bike;
  try {
    if (bike === "own") window.localStorage.setItem(BIKE_STORAGE_KEY, "own");
    else window.localStorage.removeItem(BIKE_STORAGE_KEY);
  } catch {
    // Prywatny tryb albo zablokowany magazyn: wybór działa do przeładowania strony (`chosen`).
  }
  for (const listener of listeners) listener();
}

export function useBike(): Bike {
  return useSyncExternalStore(subscribe, readBike, () => "veturilo");
}
