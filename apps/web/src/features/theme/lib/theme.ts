/** What the user picked; "system" follows the phone's light/dark setting. */
export type ThemePreference = "system" | "light" | "dark";
export type Theme = "light" | "dark";

export const THEME_PREFERENCES: readonly ThemePreference[] = ["light", "dark", "system"];

export const THEME_PREFERENCE_LABELS: Record<ThemePreference, string> = {
  light: "Jasny",
  dark: "Ciemny",
  system: "Auto",
};

/** localStorage key; the inline script in app/layout.tsx reads the same one before first paint. */
export const THEME_STORAGE_KEY = "sawa-theme";

export const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export function parseThemePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveTheme(preference: ThemePreference, isSystemDark: boolean): Theme {
  if (preference === "system") return isSystemDark ? "dark" : "light";
  return preference;
}

/**
 * Runs in <head> before React, so the first paint already has the right theme (no light flash).
 * Mirrors parseThemePreference + resolveTheme; keep the three in sync.
 */
export const THEME_INIT_SCRIPT = `try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var d=p==="dark"||(p!=="light"&&matchMedia("${DARK_MEDIA_QUERY}").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}`;
