"use client";

import { useEffect, useRef } from "react";
import type { MockStop } from "./mock-data";

/** Cała jazda demo: ok. 1,5 min na scenie, niezależnie od długości trasy (T-36). */
export const DEMO_DRIVE_MS = 90_000;

/** Ostatni punkt, do którego dojechaliśmy przy danym postępie (0–1 trasy). */
export function stopIndexAt(stops: readonly MockStop[], progress: number): number {
  let index = 0;
  stops.forEach((stop, i) => {
    if (stop.along <= progress) index = i;
  });
  return index;
}

/**
 * Symuluje jazdę: co chwilę przesuwa aktywny punkt tak, jakby autobus jechał po trasie,
 * a czas to `DEMO_DRIVE_MS` zamiast prawdziwego ETA. Start od początku trasy przy każdej
 * zmianie `stops`, a kończy się, gdy dojedzie do końca.
 */
export function useDemoDrive(
  enabled: boolean,
  stops: readonly MockStop[],
  onIndex: (index: number) => void,
) {
  const onIndexRef = useRef(onIndex);
  useEffect(() => {
    onIndexRef.current = onIndex;
  });

  useEffect(() => {
    if (!enabled || stops.length === 0) return;
    const startedAt = performance.now();
    let last = -1;
    const tick = () => {
      const progress = Math.min(1, (performance.now() - startedAt) / DEMO_DRIVE_MS);
      const index = stopIndexAt(stops, progress);
      if (index !== last) {
        last = index;
        onIndexRef.current(index);
      }
      if (progress >= 1) window.clearInterval(id);
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [enabled, stops]);
}
