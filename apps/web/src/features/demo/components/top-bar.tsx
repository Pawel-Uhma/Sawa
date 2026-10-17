"use client";

import { motion } from "motion/react";
import { SPRING } from "../lib/device";
import { SawaMenuButton } from "./sawa-menu";

/**
 * Znak Sawy nad mapą: na telefonie sama głowa, na desktopie pełne logo. Otwiera menu aplikacji.
 * Na desktopie w trybie trasy logo jest w panelu, więc tu je chowamy.
 */
export function TopBar({ hideOnDesktop = false }: { hideOnDesktop?: boolean }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={SPRING}
      className={`pointer-events-none absolute left-0 top-0 z-20 px-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-6 md:pt-6 ${
        hideOnDesktop ? "md:hidden" : ""
      }`}
    >
      <SawaMenuButton />
    </motion.header>
  );
}
