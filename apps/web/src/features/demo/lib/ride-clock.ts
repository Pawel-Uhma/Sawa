"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MockStop } from "./mock-data";

/** Sawa starts on a place this long before passing it: „zaraz mijamy”. */
export const LEAD_SEC = 15;
const TICK_MS = 1000;

/** Seconds from the start of the ride to the place (planner `etaSec`, else the rounded minutes). */
export function etaSecOf(stop: Pick<MockStop, "etaMin" | "etaSec">): number {
  return stop.etaSec ?? stop.etaMin * 60;
}

/** When the story of this place should start, in seconds from the start of the ride. */
export function storyStartSec(stop: Pick<MockStop, "etaMin" | "etaSec">): number {
  return Math.max(0, etaSecOf(stop) - LEAD_SEC);
}

/** The last place whose story should have started by `rideSec` (0 before the first one). */
export function dueIndex(stops: readonly MockStop[], rideSec: number): number {
  let due = 0;
  stops.forEach((stop, index) => {
    if (storyStartSec(stop) <= rideSec) due = index;
  });
  return due;
}

/**
 * Time on the ride, until location replaces it: starts with a new route and runs like the
 * tram, also while Sawa is paused. `syncTo` moves it to a place the user picked by hand.
 */
export function useRideClock(stops: readonly MockStop[]) {
  // Set in the effect: Date.now() during render breaks the prerender with cacheComponents.
  const startedAt = useRef(0);
  const [rideSec, setRideSec] = useState(0);

  useEffect(() => {
    startedAt.current = Date.now();
    setRideSec(0);
    if (stops.length === 0) return;
    const id = setInterval(
      () => setRideSec(Math.floor((Date.now() - startedAt.current) / 1000)),
      TICK_MS,
    );
    return () => clearInterval(id);
  }, [stops]);

  const syncTo = useCallback(
    (index: number) => {
      const stop = stops[index];
      if (!stop) return;
      const sec = storyStartSec(stop);
      startedAt.current = Date.now() - sec * 1000;
      setRideSec(sec);
    },
    [stops],
  );

  const due = dueIndex(stops, rideSec);
  const next = stops[due + 1];
  return {
    rideSec,
    dueIndex: due,
    /** Seconds until the next story should start; null after the last place. */
    nextInSec: next ? Math.max(0, storyStartSec(next) - rideSec) : null,
    syncTo,
  };
}

export type RideClock = ReturnType<typeof useRideClock>;
