"use client";

import { AnimatePresence, motion } from "motion/react";
import { useT } from "@/features/i18n";

const SPRING = { type: "spring", bounce: 0, duration: 0.3 } as const;

/**
 * 2D / 3D switch above the "back to me" button (#199). The label names the view a tap gives,
 * like Google Maps; the old label slides out the way the new one comes in.
 */
export function ViewToggle({ is3d, onToggle }: { is3d: boolean; onToggle: () => void }) {
  const t = useT();
  const next = is3d ? "2D" : "3D";
  return (
    <button
      type="button"
      aria-label={
        is3d
          ? t("Płaska mapa (2D)", "Flat map (2D)")
          : t("Mapa 3D z budynkami", "3D map with buildings")
      }
      aria-pressed={is3d}
      onClick={onToggle}
      className="szklo pointer-events-auto relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-[13px] text-glebia tracking-tight transition-transform duration-100 active:scale-[0.92]"
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={next}
          aria-hidden="true"
          initial={{ opacity: 0, y: is3d ? -8 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: is3d ? 8 : -8 }}
          transition={SPRING}
        >
          {next}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
