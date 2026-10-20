"use client";

import type { LatLng } from "@sawa/shared";
import { useEffect } from "react";
import type { MockStop } from "./mock-data";
import { isAt, type RideClock } from "./ride-clock";
import { isApproaching, type RouteAlong, userAlongM } from "./route-progress";

/**
 * Tyle punktów do przodu patrzymy. Na pętli koniec leży przy starcie, więc bez limitu
 * Sawa od razu przeskoczyłaby do ostatniego tematu.
 */
export const MAX_AHEAD = 2;

/**
 * Najdalszy z kolejnych `MAX_AHEAD` punktów po `from`, do którego telefon dojechał: jest przy
 * nim (`isAt`, `ARRIVE_M` z zegara jazdy) albo, z linią trasy (`along`), do punktu zostało
 * najwyżej `NEXT_STORY_M` jazdy. -1, gdy żaden.
 */
export function reachedIndex(
  stops: readonly MockStop[],
  position: LatLng,
  from: number,
  along?: RouteAlong | null,
): number {
  const last = Math.min(stops.length - 1, from + MAX_AHEAD);
  const userM = along ? userAlongM(along, position, from, last) : null;
  for (let index = last; index > from; index--) {
    const stop = stops[index];
    if (!stop) continue;
    if (isAt(position, stop)) return index;
    const stopM = along?.stopsM[index];
    if (userM !== null && stopM !== undefined && isApproaching(userM, stopM)) return index;
  }
  return -1;
}

/**
 * Lokalizacja przesuwa zegar jazdy dalej niż pierwsze miejsce (to obsługuje `DemoApp`, gdy
 * Sawa czeka): gdy do kolejnego punktu zostaje ok. 200 m trasy, zegar staje na „jestem tutaj”,
 * więc tramwaj spóźniony albo szybszy od rozkładu nie rozjeżdża się z opowieścią. Bieżąca
 * opowieść kończy się sama (`afterStory`), następna rusza po niej, nigdy w pół zdania.
 * Bez lokalizacji (`position` null) zostaje sam zegar. Zegar idzie tylko do przodu i stoi,
 * gdy użytkownik zatrzymał Sawę (`held`): po wznowieniu dogania lokalizację.
 */
export function useGpsClockSync(
  stops: readonly MockStop[],
  position: LatLng | null,
  clock: Pick<RideClock, "dueIndex" | "held" | "syncTo">,
  along?: RouteAlong | null,
) {
  const { dueIndex, held, syncTo } = clock;
  useEffect(() => {
    if (!position || held) return;
    const index = reachedIndex(stops, position, dueIndex, along);
    if (index > dueIndex) syncTo(index);
  }, [stops, position, dueIndex, held, syncTo, along]);
}
