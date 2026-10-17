"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { setThemePreference, useTheme } from "../hooks/use-theme";

const ICON_SPRING = { type: "spring", bounce: 0.3, duration: 0.45 } as const;

/**
 * Round sun / moon button: one tap switches between light and dark (sets an explicit choice).
 * "Auto" (follow the system) stays in the full ThemeSwitch in the Sawa menu.
 */
export function ThemeToggleButton({ className = "" }: { className?: string }) {
  const theme = useTheme();
  const isReducedMotion = useReducedMotion();
  const isDark = theme === "dark";
  const transition = isReducedMotion ? { duration: 0 } : ICON_SPRING;

  return (
    <button
      type="button"
      onClick={() => setThemePreference(isDark ? "light" : "dark")}
      aria-label={isDark ? "Włącz jasny motyw" : "Włącz ciemny motyw"}
      className={`relative flex size-11 shrink-0 items-center justify-center rounded-full text-tekst-2 transition-[background-color,transform] duration-100 hover:bg-powierzchnia active:scale-90 active:bg-powierzchnia ${className}`}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.svg
          key={theme}
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
          transition={transition}
        >
          {isDark ? <MoonPath /> : <SunPath />}
        </motion.svg>
      </AnimatePresence>
    </button>
  );
}

function SunPath() {
  return (
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
    </g>
  );
}

function MoonPath() {
  return (
    <path
      d="M20 14.6A8 8 0 0 1 9.4 4a8 8 0 1 0 10.6 10.6Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  );
}
