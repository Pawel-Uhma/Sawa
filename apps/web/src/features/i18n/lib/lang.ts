/** Interface language. Polish is the default; English is for visitors. */
export type Lang = "pl" | "en";

export const LANGS: readonly Lang[] = ["pl", "en"];

/** Each option in its own language, so a visitor finds theirs. */
export const LANG_LABELS: Record<Lang, string> = {
  pl: "Polski",
  en: "English",
};

/** BCP 47 tag for dates, numbers and collation. */
export const LANG_LOCALES: Record<Lang, string> = {
  pl: "pl-PL",
  en: "en-GB",
};

/** localStorage key, per device like the theme. */
export const LANG_STORAGE_KEY = "sawa-lang";

export function parseLang(value: unknown): Lang {
  return value === "en" ? "en" : "pl";
}

/** Picks the text for the language; for code outside React (labels, formatters). */
export function pick<T>(lang: Lang, pl: T, en: T): T {
  return lang === "en" ? en : pl;
}

/** Runs in <head> before React, so screen readers get the right <html lang> at once. */
export const LANG_INIT_SCRIPT = `try{if(localStorage.getItem("${LANG_STORAGE_KEY}")==="en")document.documentElement.lang="en"}catch(e){}`;
