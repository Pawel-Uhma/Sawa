/** What the user picked; "system" follows the phone's light/dark setting. */
export type ThemePreference = "system" | "light" | "dark";
export type Theme = "light" | "dark";

export const THEME_PREFERENCES: readonly ThemePreference[] = ["light", "dark", "system"];

export const THEME_PREFERENCE_LABELS: Record<ThemePreference, string> = {
  light: "Jasny",
  dark: "Ciemny",
  system: "Auto",
};

export const THEME_PREFERENCE_LABELS_EN: Record<ThemePreference, string> = {
  light: "Light",
  dark: "Dark",
  system: "Auto",
};

/** localStorage key; the inline script in app/layout.tsx reads the same one before first paint. */
export const THEME_STORAGE_KEY = "sawa-theme";

export const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export function parseThemePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

/** High contrast (black and yellow) always runs on the dark theme, so the map is dark too. */
export function resolveTheme(
  preference: ThemePreference,
  isSystemDark: boolean,
  isHighContrast = false,
): Theme {
  if (isHighContrast) return "dark";
  if (preference === "system") return isSystemDark ? "dark" : "light";
  return preference;
}

/** High contrast: black and yellow on top of the dark theme; "system" follows prefers-contrast. */
export type ContrastPreference = "system" | "more" | "normal";

export const CONTRAST_STORAGE_KEY = "sawa-contrast";

export const MORE_CONTRAST_MEDIA_QUERY = "(prefers-contrast: more)";

export function parseContrastPreference(value: unknown): ContrastPreference {
  return value === "more" || value === "normal" ? value : "system";
}

export function resolveHighContrast(
  preference: ContrastPreference,
  isSystemMoreContrast: boolean,
): boolean {
  if (preference === "system") return isSystemMoreContrast;
  return preference === "more";
}

/**
 * Runs in <head> before React, so the first paint already has the right theme (no light flash).
 * Mirrors parseThemePreference + resolveTheme (and the contrast pair); keep them in sync.
 */
export const THEME_INIT_SCRIPT = `try{var c=localStorage.getItem("${CONTRAST_STORAGE_KEY}");var m=c==="more"||(c!=="normal"&&matchMedia("${MORE_CONTRAST_MEDIA_QUERY}").matches);document.documentElement.dataset.contrast=m?"more":"normal"}catch(e){}try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var d=m||p==="dark"||(p!=="light"&&matchMedia("${DARK_MEDIA_QUERY}").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}`;
