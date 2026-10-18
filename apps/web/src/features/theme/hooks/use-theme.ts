"use client";

import { useSyncExternalStore } from "react";
import {
  DARK_MEDIA_QUERY,
  parseThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type Theme,
  type ThemePreference,
} from "../lib/theme";

// One store for the whole app: the preference lives in localStorage (per device, a convenience),
// the resolved theme in <html data-theme>, which the CSS in globals.css reads.
const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    return parseThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

function readTheme(): Theme {
  // data-contrast is set first (init script, use-contrast), so the theme can follow it.
  return resolveTheme(
    readPreference(),
    window.matchMedia(DARK_MEDIA_QUERY).matches,
    document.documentElement.dataset.contrast === "more",
  );
}

/** Re-resolves the theme; use-contrast calls it after high contrast changes. */
export function applyTheme() {
  document.documentElement.dataset.theme = readTheme();
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia(DARK_MEDIA_QUERY);
  if (listeners.size === 0) media.addEventListener("change", applyTheme);
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0) media.removeEventListener("change", applyTheme);
  };
}

export function setThemePreference(preference: ThemePreference) {
  try {
    if (preference === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Private mode or blocked storage: the choice still applies until the page reloads.
  }
  applyTheme();
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, readPreference, () => "system");
}

/** Light or dark after resolving "system"; the map picks its basemap and layer colours from it. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readTheme, () => "light");
}
