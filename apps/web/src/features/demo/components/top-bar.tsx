"use client";

import { motion } from "motion/react";
import { SPRING } from "../lib/device";
import { PLACEHOLDER_WEATHER } from "../lib/mock-data";
import { CloudIcon } from "./icons";
import { Logo } from "./logo";

/** Logo i pogoda nad mapą. Na desktopie w trybie trasy logo jest w panelu, więc tu je chowamy. */
export function TopBar({ hideLogoOnDesktop = false }: { hideLogoOnDesktop?: boolean }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={SPRING}
      className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-6 md:pt-6"
    >
      <div
        className={`pointer-events-auto szklo flex h-12 items-center rounded-full px-4 ${hideLogoOnDesktop ? "md:invisible" : ""}`}
      >
        <Logo className="text-[26px]" />
      </div>
      <div className="pointer-events-auto szklo flex h-12 items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold text-tekst">
        <CloudIcon className="size-5 text-tekst-2" />
        {PLACEHOLDER_WEATHER.tempC}°
        <span className="font-medium text-tekst-2">{PLACEHOLDER_WEATHER.place}</span>
      </div>
    </motion.header>
  );
}
