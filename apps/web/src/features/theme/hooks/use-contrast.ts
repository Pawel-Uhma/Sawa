"use client";

import { useSyncExternalStore } from "react";
import {
  CONTRAST_STORAGE_KEY,
  MORE_CONTRAST_MEDIA_QUERY,
  parseContrastPreference,
  resolveHighContrast,
} from "../lib/theme";
import { applyTheme } from "./use-theme";

// Same pattern as use-theme: the choice in localStorage, the resolved value in <html data-contrast>,
// which globals.css reads. Absent choice = follow the system "Increase contrast" setting.
const listeners = new Set<() => void>();

function readHighContrast(): boolean {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(CONTRAST_STORAGE_KEY);
  } catch {
    // Blocked storage: follow the system.
  }
  return resolveHighContrast(
    parseContrastPreference(stored),
    window.matchMedia(MORE_CONTRAST_MEDIA_QUERY).matches,
  );
}

function applyContrast() {
  document.documentElement.dataset.contrast = readHighContrast() ? "more" : "normal";
  // High contrast forces the dark theme (and the dark map), so the theme store re-resolves too.
  applyTheme();
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia(MORE_CONTRAST_MEDIA_QUERY);
  if (listeners.size === 0) media.addEventListener("change", applyContrast);
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0) media.removeEventListener("change", applyContrast);
  };
}

/** Explicit on/off; when it matches the system setting we drop the choice so the system leads again. */
export function setHighContrast(isOn: boolean) {
  try {
    if (isOn === window.matchMedia(MORE_CONTRAST_MEDIA_QUERY).matches) {
      window.localStorage.removeItem(CONTRAST_STORAGE_KEY);
    } else {
      window.localStorage.setItem(CONTRAST_STORAGE_KEY, isOn ? "more" : "normal");
    }
  } catch {
    // Private mode or blocked storage: the choice still applies until the page reloads.
  }
  applyContrast();
}

export function useHighContrast(): boolean {
  return useSyncExternalStore(subscribe, readHighContrast, () => false);
}
