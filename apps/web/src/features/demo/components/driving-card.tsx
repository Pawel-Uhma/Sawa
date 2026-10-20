"use client";

import { motion, useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef } from "react";
import { useT } from "@/features/i18n";
import { haptic, SPRING } from "../lib/device";
import { CarIcon } from "./icons";
import { SawaHead } from "./logo";

type DrivingCardProps = {
  /** Miejsce, o którym Sawa teraz mówi; null, gdy milczy. */
  place: string | null;
  /** Ile minut do pierwszego miejsca; null po jego minięciu. */
  waitMin: number | null;
  /** Kierowca stanął: wraca pełny arkusz trasy z odtwarzaczem. */
  onParked: () => void;
  onCoverChange?: (px: number) => void;
};

/**
 * Jazda autem (#190): tylko głos. Zamiast arkusza z listą miejsc i przyciskami jedna duża karta,
 * na którą nie trzeba patrzeć: kto mówi i o czym. Jedyny przycisk to „Stoję”, na postoju.
 */
export function DrivingCard({ place, waitMin, onParked, onCoverChange }: DrivingCardProps) {
  const t = useT();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const card = ref.current;
    if (!card || !onCoverChange) return;
    const report = () => onCoverChange(card.offsetHeight + 12);
    const observer = new ResizeObserver(report);
    observer.observe(card);
    report();
    return () => observer.disconnect();
  }, [onCoverChange]);

  return (
    <motion.div
      ref={ref}
      role="status"
      aria-live="polite"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
      transition={SPRING}
      className="absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 rounded-3xl bg-powierzchnia p-4 shadow-[0_1px_2px_rgba(16,43,42,0.06),0_10px_30px_rgba(16,43,42,0.10)] md:left-auto md:right-6 md:bottom-6 md:w-[380px]"
    >
      <div className="flex items-center gap-3">
        <SawaHead className="size-12 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="etykieta flex items-center gap-1.5">
            <CarIcon className="size-3.5" />
            {t("Jedziesz autem · tylko głos", "Driving · voice only")}
          </p>
          <p className="truncate text-[19px] font-extrabold leading-snug tracking-[-0.01em]">
            {place
              ? place
              : waitMin !== null
                ? t(
                    `Pierwsze miejsce za ok. ${Math.max(1, waitMin)} min`,
                    `First place in about ${Math.max(1, waitMin)} min`,
                  )
                : t("Sawa odezwie się przy następnym miejscu", "Sawa speaks at the next place")}
          </p>
        </div>
      </div>
      <p className="mt-2 text-[13px] text-tekst-2">
        {t(
          "Patrz na drogę. Sawa sama opowie o miejscach po drodze.",
          "Eyes on the road. Sawa tells you about the places on the way.",
        )}
      </p>
      <button
        type="button"
        onClick={() => {
          haptic();
          onParked();
        }}
        className="mt-3 h-11 w-full rounded-2xl bg-tekst/[0.06] text-[15px] font-bold text-tekst transition-transform duration-100 active:scale-[0.98]"
      >
        {t("Stoję, pokaż trasę", "I've stopped, show the route")}
      </button>
    </motion.div>
  );
}
