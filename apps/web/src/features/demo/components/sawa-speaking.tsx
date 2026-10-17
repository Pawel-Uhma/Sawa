"use client";

import { motion, useReducedMotion } from "motion/react";
import { useT } from "@/features/i18n";
import { haptic, SPRING } from "../lib/device";
import { SawaHead } from "./logo";

type SawaSpeakingProps = {
  /** Nazwa miejsca, o którym Sawa teraz mówi. */
  place: string | null;
  onOpen: () => void;
};

/**
 * Sawa mówi, a Ty jesteś poza trasą: szklana pigułka w prawym górnym rogu, jak Dynamic Island.
 * Pojawia się tylko na czas opowieści i prowadzi do zakładki Sawy. Poza tym Sawa siedzi w menu (logo).
 */
export function SawaSpeaking({ place, onOpen }: SawaSpeakingProps) {
  const t = useT();
  const reduce = useReducedMotion();
  const glow = reduce
    ? { opacity: 0.7, scale: 1.1 }
    : { opacity: [0.35, 0.85, 0.35], scale: [1, 1.25, 1] };

  return (
    <motion.button
      type="button"
      onClick={() => {
        haptic();
        onOpen();
      }}
      initial={{ opacity: 0, scale: 0.8, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -8 }}
      transition={SPRING}
      style={{ transformOrigin: "100% 50%" }}
      className="szklo absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-30 flex h-12 max-w-[60vw] items-center gap-2 rounded-full p-1 pr-4 transition-transform duration-100 active:scale-[0.96] md:right-6 md:top-6"
    >
      <span className="relative size-10 shrink-0">
        <motion.span
          aria-hidden="true"
          animate={glow}
          transition={
            reduce ? SPRING : { duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
          }
          className="absolute inset-0 rounded-full bg-mieta blur-md"
        />
        <SawaHead className="relative size-full" />
      </span>
      <span className="min-w-0 text-left leading-tight">
        <span className="block text-[13px] font-bold text-glebia">
          {t("Sawa opowiada", "Sawa is talking")}
        </span>
        {place && (
          <span className="block truncate text-[12px] font-semibold text-tekst-2">{place}</span>
        )}
      </span>
    </motion.button>
  );
}
