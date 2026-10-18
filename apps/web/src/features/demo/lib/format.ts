import { LANG_LOCALES, type Lang } from "@/features/i18n";
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

/** Kiedy Sawa coś opowiedziała: „dziś, 14:32” albo „17.10, 9:05” („today, 14:32” po angielsku). */
export function formatWhen(at: number, now = Date.now(), lang: Lang = "pl"): string {
  const clock = new Intl.DateTimeFormat(LANG_LOCALES[lang], { hour: "2-digit", minute: "2-digit" });
  const day = new Intl.DateTimeFormat(LANG_LOCALES[lang], { day: "numeric", month: "numeric" });
  const date = new Date(at);
  const sameDay = new Date(now).toDateString() === date.toDateString();
  const today = lang === "en" ? "today" : "dziś";
  return sameDay ? `${today}, ${clock.format(date)}` : `${day.format(date)}, ${clock.format(date)}`;
}

/** „1 miejsce”, „3 miejsca”, „40 miejsc” („1 place”, „40 places”). */
export function placesLabel(n: number, lang: Lang = "pl"): string {
  if (lang === "en") return `${n} ${n === 1 ? "place" : "places"}`;
  const tens = n % 100;
  const ones = n % 10;
  if (n === 1) return "1 miejsce";
  if (ones >= 2 && ones <= 4 && (tens < 12 || tens > 14)) return `${n} miejsca`;
  return `${n} miejsc`;
}
