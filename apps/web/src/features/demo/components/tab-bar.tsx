"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ComponentType, SVGProps } from "react";
import { haptic, SPRING } from "../lib/device";
import { PinIcon, RoutesIcon } from "./icons";
import { SawaHead } from "./logo";

export type Tab = "map" | "rides" | "sawa";

const TABS: { key: Tab; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { key: "map", label: "Mapa", Icon: PinIcon },
  // Sawa w środku: zamiast ikony jej głowa (SawaTabButton)
  { key: "sawa", label: "Sawa", Icon: PinIcon },
  { key: "rides", label: "Przejażdżki", Icon: RoutesIcon },
];

type TabBarProps = {
  active: Tab;
  onChange: (tab: Tab) => void;
  /** Sawa mówi teraz: jej głowa świeci się w pasku. */
  speaking: boolean;
};

/** Pływający pasek zakładek: na dole na telefonie, u góry pośrodku na desktopie. */
export function TabBar({ active, onChange, speaking }: TabBarProps) {
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
        const onClick = () => {
          if (!isActive) haptic();
          onChange(key);
        };
        if (key === "sawa") {
          return (
            <SawaTabButton key={key} active={isActive} speaking={speaking} onClick={onClick} />
          );
        }
        return (
          <button
            key={key}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={onClick}
            className={`relative flex h-14 w-24 flex-col items-center justify-center gap-0.5 rounded-[26px] text-[11px] font-semibold transition-colors duration-200 active:scale-[0.96] md:h-9 md:w-auto md:flex-row md:gap-2 md:px-4 md:text-sm ${
              isActive ? "text-glebia" : "text-tekst-3 hover:text-tekst-2"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="zakladka-tlo"
                transition={SPRING}
                className="absolute inset-0 rounded-[inherit] bg-powierzchnia/80 shadow-[0_1px_3px_rgba(16,43,42,0.08)]"
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

/**
 * Głowa Sawy jako przycisk zakładki. Na telefonie wystaje nad pasek, na desktopie siedzi w jego linii.
 * Gdy Sawa mówi, mięta poświata oddycha; przy ruchu ograniczonym świeci stałym blaskiem.
 */
function SawaTabButton({
  active,
  speaking,
  onClick,
}: {
  active: boolean;
  speaking: boolean;
  onClick: () => void;
}) {
  const reduce = useReducedMotion();
  const glow = speaking
    ? reduce
      ? { opacity: 0.7, scale: 1.1 }
      : { opacity: [0.35, 0.85, 0.35], scale: [1, 1.2, 1] }
    : { opacity: 0, scale: 1 };
  const glowTransition =
    speaking && !reduce
      ? { duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" as const }
      : SPRING;

  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={`relative flex h-14 w-24 flex-col items-center justify-end pb-1 text-[11px] font-semibold transition-colors duration-200 active:scale-[0.96] md:h-9 md:w-auto md:flex-row md:justify-center md:gap-2 md:px-4 md:pb-0 md:text-sm ${
        active ? "text-glebia" : "text-tekst-3 hover:text-tekst-2"
      }`}
    >
      <span className="absolute -top-7 left-1/2 flex size-16 -translate-x-1/2 items-center justify-center md:static md:size-8 md:translate-x-0">
        <motion.span
          aria-hidden="true"
          animate={glow}
          transition={glowTransition}
          className="absolute inset-0 rounded-full bg-mieta blur-md"
        />
        <SawaHead className="relative size-full ring-[3px] ring-powierzchnia" />
      </span>
      <span className="relative">Sawa</span>
    </button>
  );
}
