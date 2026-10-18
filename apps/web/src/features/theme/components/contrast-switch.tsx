"use client";

import { motion, useReducedMotion } from "motion/react";
import { useT } from "@/features/i18n";
import { setHighContrast, useHighContrast } from "../hooks/use-contrast";

const KNOB_SPRING = { type: "spring", bounce: 0.2, duration: 0.35 } as const;

/** iOS-style switch row: black-and-yellow high contrast (forces the dark theme). */
export function ContrastSwitch({ className = "" }: { className?: string }) {
  const t = useT();
  const isOn = useHighContrast();
  const isReducedMotion = useReducedMotion();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      onClick={() => setHighContrast(!isOn)}
      className={`flex min-h-11 w-full items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-glebia ${className}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-tight text-tekst">
          {t("Wysoki kontrast", "High contrast")}
        </span>
        <span className="mt-0.5 block text-[13px] leading-tight text-tekst-2">
          {t("Czarno-żółty, najmocniejszy kontrast", "Black and yellow, strongest contrast")}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={`flex h-[31px] w-[51px] shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ${
          isOn ? "justify-end bg-glebia" : "justify-start bg-tekst/[0.16]"
        }`}
      >
        <motion.span
          layout
          transition={isReducedMotion ? { duration: 0 } : KNOB_SPRING}
          className="size-[27px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
        />
      </span>
    </button>
  );
}
