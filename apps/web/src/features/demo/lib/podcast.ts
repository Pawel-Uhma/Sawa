import { type Lang, pick } from "@/features/i18n";

/** Wstecz w pierwszych 10% opowieści idzie do poprzedniego miejsca, później na początek bieżącej. */
export const RESTART_PROGRESS = 10;

/** Czas na suwaku i przy nim: „m:ss”, od godziny „h:mm:ss”. */
export function formatClock(sec: number): string {
  const whole = Math.max(0, Math.floor(sec));
  const pad = (n: number) => `${n < 10 ? "0" : ""}${n}`;
  const h = Math.floor(whole / 3600);
  const m = Math.floor(whole / 60) % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(whole % 60)}` : `${m}:${pad(whole % 60)}`;
}

/** Za ile coś nastąpi, po ludzku: „za chwilę” albo „za ok. N min”. */
export function inMinutes(sec: number, lang: Lang = "pl"): string {
  const min = Math.round(sec / 60);
  if (sec < 60) return pick(lang, "za chwilę", "in a moment");
  return pick(lang, `za ok. ${min} min`, `in about ${min} min`);
}

/**
 * Dokąd prowadzi „wstecz”: indeks poprzedniego miejsca albo ten sam, gdy opowieść już trwa
 * (wtedy zaczyna się od nowa), jak w odtwarzaczach podcastów.
 */
export function backTarget(activeIndex: number, progress: number): number {
  return progress < RESTART_PROGRESS && activeIndex > 0 ? activeIndex - 1 : activeIndex;
}

/**
 * Nazwa miejsca bez adresu w nawiasie na końcu, np. „Szpital św. Zofii (ul. Żelazna 90)”:
 * tytuł zostaje krótki, a adres idzie pod niego osobną linią.
 */
export function splitName(name: string): { title: string; sub: string | null } {
  const match = /^(.+?)\s*\(([^()]+)\)\s*$/.exec(name);
  return match ? { title: match[1], sub: match[2] } : { title: name, sub: null };
}
