"use client";

import { useCallback, useSyncExternalStore } from "react";
import { LANG_STORAGE_KEY, type Lang, parseLang, pick } from "../lib/lang";

// One store for the whole app, like features/theme: the choice lives in localStorage.
const listeners = new Set<() => void>();

function readLang(): Lang {
  try {
    return parseLang(window.localStorage.getItem(LANG_STORAGE_KEY));
  } catch {
    return "pl";
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function setLang(lang: Lang) {
  try {
    if (lang === "pl") window.localStorage.removeItem(LANG_STORAGE_KEY);
    else window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Private mode or blocked storage: the choice still applies until the page reloads.
  }
  document.documentElement.lang = lang;
  for (const listener of listeners) listener();
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, readLang, () => "pl");
}

/** `t("Polski tekst", "English text")`: both versions sit next to each other in the component. */
export function useT() {
  const lang = useLang();
  return useCallback(<T>(pl: T, en: T): T => pick(lang, pl, en), [lang]);
}
