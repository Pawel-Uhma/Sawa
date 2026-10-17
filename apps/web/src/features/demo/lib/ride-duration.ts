import { DURATION_STOPS_MIN } from "./mock-data";

/**
 * Kroki suwaka czasu. Gdy cel jest wybrany, najkrótszy krok to czas najszybszej drogi (T-110):
 * krótszej przejażdżki do tego celu planer nie ułoży, więc suwak tam nie schodzi.
 */
export function durationStops(floorMin: number | null): number[] {
  if (floorMin === null) return DURATION_STOPS_MIN;
  return [floorMin, ...DURATION_STOPS_MIN.filter((value) => value > floorMin)];
}

/** Czas nie spada poniżej najszybszej drogi do celu. */
export function clampDuration(durationMin: number, floorMin: number | null): number {
  return floorMin === null ? durationMin : Math.max(durationMin, floorMin);
}

/** Pozycja kroku na torze w procentach (po indeksie kroku, nie po minutach). */
export function stopPercent(durationMin: number, stops: readonly number[]): number {
  const index = stops.indexOf(durationMin);
  return (index / Math.max(stops.length - 1, 1)) * 100;
}
