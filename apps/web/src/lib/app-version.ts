/*
 * Wersja aplikacji: data i godzina commita w czasie warszawskim, np. „2026.10.20-0903”, plus
 * krótki commit. Tak samo liczy ją CI przy tagu i wydaniu (.github/workflows/ci.yml) i build
 * (build-version.ts), więc wersja w aplikacji to nazwa wydania na GitHubie (tag v…).
 */

const PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Warsaw",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** „2026.10.20-0903” z chwili commita (czas warszawski). */
export function calver(commitDate: Date): string {
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    PARTS.formatToParts(commitDate).find((p) => p.type === type)?.value ?? "";
  return `${part("year")}.${part("month")}.${part("day")}-${part("hour")}${part("minute")}`;
}

/** Wersja wbudowana przy buildzie (next.config.ts); „dev” bez gita, np. w kontenerze bez .git. */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "dev";
/** Krótki commit buildu, pusty bez gita. */
export const APP_COMMIT = process.env.NEXT_PUBLIC_APP_COMMIT || "";
