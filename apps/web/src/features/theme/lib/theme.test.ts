import { describe, expect, it } from "vitest";
import {
  parseContrastPreference,
  parseThemePreference,
  resolveHighContrast,
  resolveTheme,
} from "./theme";

describe("parseThemePreference", () => {
  it("keeps a stored light or dark choice", () => {
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
  });

  it("falls back to the system setting for anything else", () => {
    expect(parseThemePreference(null)).toBe("system");
    expect(parseThemePreference("system")).toBe("system");
    expect(parseThemePreference("ciemny")).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("follows the system setting when the user picked system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("ignores the system setting when the user picked a theme", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("forces dark under high contrast", () => {
    expect(resolveTheme("light", false, true)).toBe("dark");
    expect(resolveTheme("system", false, true)).toBe("dark");
  });
});

describe("parseContrastPreference", () => {
  it("keeps a stored choice and falls back to the system setting", () => {
    expect(parseContrastPreference("more")).toBe("more");
    expect(parseContrastPreference("normal")).toBe("normal");
    expect(parseContrastPreference(null)).toBe("system");
    expect(parseContrastPreference("high")).toBe("system");
  });
});

describe("resolveHighContrast", () => {
  it("follows prefers-contrast only when the user picked nothing", () => {
    expect(resolveHighContrast("system", true)).toBe(true);
    expect(resolveHighContrast("system", false)).toBe(false);
    expect(resolveHighContrast("more", false)).toBe(true);
    expect(resolveHighContrast("normal", true)).toBe(false);
  });
});
