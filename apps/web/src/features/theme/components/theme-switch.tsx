"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { useT } from "@/features/i18n";
import { useHighContrast } from "../hooks/use-contrast";
import { setThemePreference, useThemePreference } from "../hooks/use-theme";
import {
  THEME_PREFERENCE_LABELS,
  THEME_PREFERENCE_LABELS_EN,
  THEME_PREFERENCES,
} from "../lib/theme";

const THUMB_SPRING = { type: "spring", bounce: 0.15, duration: 0.4 } as const;

/** Segmented control like in iOS: Jasny / Ciemny / Auto, the thumb slides to the picked one. */
export function ThemeSwitch({ className = "" }: { className?: string }) {
  const t = useT();
  const preference = useThemePreference();
  const isReducedMotion = useReducedMotion();
  const groupName = useId();
  // High contrast forces the dark theme, so the choice waits until it is off.
  const isLocked = useHighContrast();

  return (
    <fieldset
      disabled={isLocked}
      className={`grid grid-cols-3 rounded-[11px] bg-tekst/[0.07] p-0.5 transition-opacity duration-200 disabled:opacity-40 ${className}`}
    >
      <legend className="sr-only">{t("Wygląd", "Appearance")}</legend>
      {THEME_PREFERENCES.map((option) => {
        const isSelected = option === preference;
        return (
          <label
            key={option}
            className={`relative flex h-8 cursor-pointer items-center in-disabled:cursor-default justify-center rounded-[9px] text-[13px] font-semibold transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-glebia ${
              isSelected ? "text-tekst" : "text-tekst-2"
            }`}
          >
            <input
              type="radio"
              name={groupName}
              value={option}
              checked={isSelected}
              onChange={() => setThemePreference(option)}
              className="sr-only"
            />
            {isSelected && (
              <motion.span
                layoutId={groupName}
                transition={isReducedMotion ? { duration: 0 } : THUMB_SPRING}
                className="absolute inset-0 rounded-[9px] bg-powierzchnia shadow-[0_1px_3px_rgba(16,43,42,0.14)]"
              />
            )}
            <span className="relative">
              {t(THEME_PREFERENCE_LABELS[option], THEME_PREFERENCE_LABELS_EN[option])}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
