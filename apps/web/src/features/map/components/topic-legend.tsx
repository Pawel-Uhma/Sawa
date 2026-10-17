"use client";

import { INTERESTS, type Interest } from "@sawa/shared";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useState } from "react";
import { useT } from "@/features/i18n";
import { useTheme } from "@/features/theme";
import { TOPIC_COLORS } from "../lib/map-style";

/** Same names as the topic chips in onboarding (features/demo/lib/onboarding.ts). */
const TOPIC_NAMES: Record<Interest, [pl: string, en: string]> = {
  historical: ["Historia", "History"],
  cultural: ["Kultura", "Culture"],
  sports: ["Sport", "Sport"],
  nature: ["Przyroda", "Nature"],
};

/** Opens from the button's corner, critically damped so it never wobbles over the map. */
const SPRING = { type: "spring", bounce: 0, duration: 0.35 } as const;

type TopicLegendProps = {
  /** The legend sits under the zoom buttons when they are shown. */
  hasZoomControls: boolean;
};

/**
 * Small collapsible legend in the top-right corner: which colour is which topic (T-151, #102).
 * Collapsed it is one round button, so it never covers the route or the place card.
 */
export function TopicLegend({ hasZoomControls }: TopicLegendProps) {
  const t = useT();
  const theme = useTheme();
  const isReduced = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const colors = TOPIC_COLORS[theme];

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  return (
    <div
      className={`legenda-mapy absolute z-[5] flex flex-col items-end gap-2 ${hasZoomControls ? "" : "legenda-mapy--bez-zoomu"}`}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={t("Legenda kolorów", "Colour legend")}
        onClick={() => setIsOpen((open) => !open)}
        className="szklo grid size-9 place-items-center rounded-full transition-transform duration-150 active:scale-[0.92]"
      >
        {/* Four dots in the topic colours: the button says what it opens. */}
        <span aria-hidden="true" className="grid grid-cols-2 gap-[3px]">
          {INTERESTS.map((topic) => (
            <span
              key={topic}
              className="size-[7px] rounded-full"
              style={{ backgroundColor: colors[topic].color }}
            />
          ))}
        </span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={panelId}
            role="region"
            aria-label={t("Kolory tematów", "Topic colours")}
            className="szklo origin-top-right rounded-2xl px-3 py-2.5"
            initial={isReduced ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={isReduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -2 }}
            transition={isReduced ? { duration: 0.15 } : SPRING}
          >
            <ul className="flex flex-col gap-1.5">
              {INTERESTS.map((topic) => (
                <li key={topic} className="flex items-center gap-2 text-[13px] text-tekst">
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: colors[topic].color }}
                  />
                  {t(...TOPIC_NAMES[topic])}
                </li>
              ))}
            </ul>
            <p className="mt-2 max-w-[11rem] text-[11px] leading-snug text-tekst-2">
              {t(
                "Kolor to temat, kształt to rodzaj miejsca.",
                "Colour is the topic, shape the kind of place.",
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
