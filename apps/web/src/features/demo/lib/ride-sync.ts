"use client";

import { fromLngLat, haversineM, type LatLng } from "@sawa/shared";
import { useEffect } from "react";
import type { MockStop } from "./mock-data";
import type { RideClock } from "./ride-clock";

/**
 * Punkt uznajemy za osiągnięty, gdy do niego zostało tyle metrów. Tramwaj jedzie ok. 6 m/s,
 * więc to ok. 40 s przed punktem, blisko `LEAD_SEC` zegara jazdy.
 */
export const APPROACH_M = 250;

/**
 * Tyle punktów do przodu patrzymy. Na pętli koniec leży przy starcie, więc bez limitu
 * Sawa od razu przeskoczyłaby do ostatniego tematu.
 */
export const MAX_AHEAD = 2;

/** Najdalszy z kolejnych `MAX_AHEAD` punktów po `from`, do którego użytkownik dojechał; -1, gdy żaden. */
export function reachedIndex(stops: readonly MockStop[], position: LatLng, from: number): number {
  const last = Math.min(stops.length - 1, from + MAX_AHEAD);
  for (let index = last; index > from; index--) {
    const stop = stops[index];
    if (stop && haversineM(position, fromLngLat(stop.coord)) <= APPROACH_M) return index;
  }
  return -1;
}

/** Metry do punktu; null bez lokalizacji albo punktu. */
export function distanceTo(stop: MockStop | undefined, position: LatLng | null): number | null {
  if (!stop || !position) return null;
  return Math.round(haversineM(position, fromLngLat(stop.coord)));
}

/**
 * Lokalizacja przesuwa zegar jazdy: przy punkcie trasy zegar staje na „jestem tutaj”,
 * więc tramwaj spóźniony albo szybszy od rozkładu nie rozjeżdża się z opowieścią.
 * Bez lokalizacji (`position` null) zostaje sam zegar. Zegar idzie tylko do przodu.
 */
export function useGpsClockSync(
  stops: readonly MockStop[],
  position: LatLng | null,
  clock: Pick<RideClock, "dueIndex" | "syncTo">,
) {
  const { dueIndex, syncTo } = clock;
  useEffect(() => {
    if (!position) return;
    const index = reachedIndex(stops, position, dueIndex);
    if (index > dueIndex) syncTo(index);
  }, [stops, position, dueIndex, syncTo]);
}
