/** Wstecz w pierwszych 10% opowieści idzie do poprzedniego miejsca, później na początek bieżącej. */
export const RESTART_PROGRESS = 10;

/** Czas na suwaku i przy nim: „m:ss”. */
export function formatClock(sec: number): string {
  const whole = Math.max(0, Math.floor(sec));
  const s = whole % 60;
  return `${Math.floor(whole / 60)}:${s < 10 ? "0" : ""}${s}`;
}

/**
 * Dokąd prowadzi „wstecz”: indeks poprzedniego miejsca albo ten sam, gdy opowieść już trwa
 * (wtedy zaczyna się od nowa), jak w odtwarzaczach podcastów.
 */
export function backTarget(activeIndex: number, progress: number): number {
  return progress < RESTART_PROGRESS && activeIndex > 0 ? activeIndex - 1 : activeIndex;
}
