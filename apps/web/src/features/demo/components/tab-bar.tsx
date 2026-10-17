"use client";

import { motion } from "motion/react";
import type { ComponentType, SVGProps } from "react";
import { haptic, SPRING } from "../lib/device";
import { ChatIcon, PinIcon, RoutesIcon } from "./icons";

export type Tab = "map" | "rides" | "sawa";

const TABS: { key: Tab; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { key: "map", label: "Mapa", Icon: PinIcon },
  { key: "rides", label: "Przejażdżki", Icon: RoutesIcon },
  { key: "sawa", label: "Sawa", Icon: ChatIcon },
];

type TabBarProps = {
  active: Tab;
  onChange: (tab: Tab) => void;
};

/** Pływający pasek zakładek: na dole na telefonie, u góry pośrodku na desktopie. */
export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <motion.nav
      aria-label="Zakładki"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={SPRING}
      className="szklo absolute inset-x-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-30 flex h-16 items-center justify-around rounded-[32px] px-2 md:inset-x-auto md:bottom-auto md:left-1/2 md:top-6 md:h-12 md:-translate-x-1/2 md:gap-1 md:rounded-full md:px-1.5"
    >
      {TABS.map(({ key, label, Icon }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => {
              if (!isActive) haptic();
              onChange(key);
            }}
            className={`relative flex h-14 w-24 flex-col items-center justify-center gap-0.5 rounded-[26px] text-[11px] font-semibold transition-colors duration-200 active:scale-[0.96] md:h-9 md:w-auto md:flex-row md:gap-2 md:px-4 md:text-sm ${
              isActive ? "text-glebia" : "text-tekst-3 hover:text-tekst-2"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="zakladka-tlo"
                transition={SPRING}
                className="absolute inset-0 rounded-[inherit] bg-white/80 shadow-[0_1px_3px_rgba(16,43,42,0.08)]"
              />
            )}
            <Icon className="relative size-6 md:size-5" />
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </motion.nav>
  );
}
