"use client";

import type { LatLng } from "@sawa/shared";
import { useEffect } from "react";
import type { MockStop } from "./mock-data";
import { isAt, type RideClock } from "./ride-clock";

/**
 * Tyle punktów do przodu patrzymy. Na pętli koniec leży przy starcie, więc bez limitu
 * Sawa od razu przeskoczyłaby do ostatniego tematu.
 */
export const MAX_AHEAD = 2;

/**
 * Najdalszy z kolejnych `MAX_AHEAD` punktów po `from`, przy którym jest telefon
 * (`isAt`, `ARRIVE_M` z zegara jazdy); -1, gdy żaden.
 */
export function reachedIndex(stops: readonly MockStop[], position: LatLng, from: number): number {
  const last = Math.min(stops.length - 1, from + MAX_AHEAD);
  for (let index = last; index > from; index--) {
    const stop = stops[index];
    if (stop && isAt(position, stop)) return index;
  }
  return -1;
}

/**
 * Lokalizacja przesuwa zegar jazdy dalej niż pierwsze miejsce (to obsługuje `DemoApp`, gdy
 * Sawa czeka): przy kolejnym punkcie trasy zegar staje na „jestem tutaj”, więc tramwaj
 * spóźniony albo szybszy od rozkładu nie rozjeżdża się z opowieścią. Bez lokalizacji
 * (`position` null) zostaje sam zegar. Zegar idzie tylko do przodu i stoi, gdy użytkownik
 * zatrzymał Sawę (`held`): po wznowieniu dogania lokalizację.
 */
export function useGpsClockSync(
  stops: readonly MockStop[],
  position: LatLng | null,
  clock: Pick<RideClock, "dueIndex" | "held" | "syncTo">,
) {
  const { dueIndex, held, syncTo } = clock;
  useEffect(() => {
    if (!position || held) return;
    const index = reachedIndex(stops, position, dueIndex);
    if (index > dueIndex) syncTo(index);
  }, [stops, position, dueIndex, held, syncTo]);
}
