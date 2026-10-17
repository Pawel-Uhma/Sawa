import { INTERESTS } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { type MapTheme, placeTopic, TOPIC_COLORS } from "./map-style";

/** WCAG 2 relative luminance and contrast ratio of two #rrggbb colours. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Card surface (--powierzchnia) and chip hint (--tekst-2) of each theme. */
const BACKGROUNDS: Record<MapTheme, { surface: string; hint: string }> = {
  light: { surface: "#ffffff", hint: "#4c6462" },
  dark: { surface: "#172120", hint: "#a6b9b7" },
};
const THEMES: MapTheme[] = ["light", "dark"];

describe("place topic", () => {
  it("maps a place's tags to its topic", () => {
    expect(placeTopic(["war_uprising"])).toBe("historical");
    expect(placeTopic(["street_art"])).toBe("cultural");
    expect(placeTopic(["sport"])).toBe("sports");
    expect(placeTopic(["nature"])).toBe("nature");
  });

  it("picks the user's first chosen topic for a place with several", () => {
    const tags = ["architecture", "religion"]; // historical and cultural
    expect(placeTopic(tags, ["cultural", "historical"])).toBe("cultural");
    expect(placeTopic(tags, ["historical", "cultural"])).toBe("historical");
    expect(placeTopic(tags, ["nature", "cultural"])).toBe("cultural");
  });

  it("falls back to INTERESTS order when the user picked none of the place's topics", () => {
    expect(placeTopic(["religion", "architecture"], ["sports"])).toBe("historical");
    expect(placeTopic(["religion", "architecture"])).toBe("historical");
  });

  it("has no topic for tags outside the contract", () => {
    expect(placeTopic(["ufo"])).toBeNull();
    expect(placeTopic([])).toBeNull();
  });
});

describe("topic colours", () => {
  it("are four different colours in each theme", () => {
    for (const theme of THEMES) {
      const colors = INTERESTS.map((topic) => TOPIC_COLORS[theme][topic].color);
      expect(new Set(colors).size).toBe(INTERESTS.length);
    }
  });

  it.each(THEMES)("pass WCAG AA in the %s theme", (theme) => {
    const { surface, hint } = BACKGROUNDS[theme];
    for (const topic of INTERESTS) {
      const { color, tint, onColor } = TOPIC_COLORS[theme][topic];
      // Chip label on the card and on the picked chip's tint: text, 4.5:1.
      expect(contrast(color, surface), `${theme} ${topic} on surface`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(color, tint), `${theme} ${topic} on tint`).toBeGreaterThanOrEqual(4.5);
      // Chip hint (--tekst-2) stays readable on the picked chip.
      expect(contrast(hint, tint), `${theme} ${topic} hint on tint`).toBeGreaterThanOrEqual(4.5);
      // Check mark on the topic colour.
      expect(contrast(onColor, color), `${theme} ${topic} check`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
