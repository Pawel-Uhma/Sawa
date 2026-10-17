import { DURATION_MAX_MIN, DURATION_MIN_MIN } from "./mock-data";

/** 90 → "1 h 30 min", 240 → "4 h", 45 → "45 min". */
export function formatDuration(durationMin: number): string {
  const hours = Math.floor(durationMin / 60);
  const minutes = durationMin % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

/** Pozycja suwaka w procentach, używana do pokolorowania toru. */
export function sliderPercent(durationMin: number): number {
  return ((durationMin - DURATION_MIN_MIN) / (DURATION_MAX_MIN - DURATION_MIN_MIN)) * 100;
}
