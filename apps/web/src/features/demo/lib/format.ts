import { DURATION_STOPS_MIN } from "./mock-data";

/** 90 → "1 h 30 min", 240 → "4 h", 45 → "45 min". */
export function formatDuration(durationMin: number): string {
  const hours = Math.floor(durationMin / 60);
  const minutes = durationMin % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

/** Pozycja suwaka w procentach (po indeksie kroku, nie po minutach), używana do pokolorowania toru. */
export function sliderPercent(durationMin: number): number {
  const index = DURATION_STOPS_MIN.indexOf(durationMin);
  return (index / (DURATION_STOPS_MIN.length - 1)) * 100;
}

const CLOCK = new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit" });
const DAY = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "numeric" });

/** Kiedy Sawa coś opowiedziała: „dziś, 14:32” albo „17.10, 9:05”. */
export function formatWhen(at: number, now = Date.now()): string {
  const date = new Date(at);
  const sameDay = new Date(now).toDateString() === date.toDateString();
  return sameDay ? `dziś, ${CLOCK.format(date)}` : `${DAY.format(date)}, ${CLOCK.format(date)}`;
}
