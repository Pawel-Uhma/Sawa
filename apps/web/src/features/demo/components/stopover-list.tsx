"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { useT } from "@/features/i18n";
import { haptic } from "../lib/device";
import type { Stopover } from "../lib/waypoints";
import { ChevronRightIcon, CloseIcon } from "./icons";

type StopoverListProps = {
  stops: readonly Stopover[];
  /** Przesuwa przystanek o jedno miejsce: -1 wcześniej, 1 później. */
  onMove: (index: number, by: -1 | 1) => void;
  onRemove: (placeId: string) => void;
};

const ROW_SPRING = { type: "spring", bounce: 0, duration: 0.35 } as const;

/**
 * Przystanki po drodze (#195), w kolejności, w jakiej trasa je mija. Numer jak pinezka na mapie,
 * strzałki zmieniają kolejność, krzyżyk zdejmuje. Wiersz przesuwa się płynnie (layout), a przy
 * ograniczonym ruchu po prostu staje na nowym miejscu (MotionConfig w demo-app).
 */
export function StopoverList({ stops, onMove, onRemove }: StopoverListProps) {
  const t = useT();
  return (
    <AnimatePresence initial={false}>
      {stops.length > 0 && (
        <motion.section
          key="przystanki"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={ROW_SPRING}
          className="overflow-hidden"
          aria-label={t("Przystanki po drodze", "Stops on the way")}
        >
          <h3 className="etykieta mt-3">{t("Przystanki po drodze", "Stops on the way")}</h3>
          <ol className="mt-1.5 space-y-1.5">
            <AnimatePresence initial={false}>
              {stops.map((stop, index) => (
                <motion.li
                  key={stop.placeId}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={ROW_SPRING}
                  className="flex min-h-11 items-center gap-2.5 rounded-[14px] bg-mieta-jasna py-1.5 pl-2 pr-1"
                >
                  <span
                    aria-hidden
                    className="grid size-6 shrink-0 place-items-center rounded-full bg-glebia text-[12px] font-extrabold text-white tabular-nums"
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[15px] font-bold leading-5 text-tekst">
                    {stop.name}
                  </span>
                  <RowButton
                    label={t(`Wcześniej: ${stop.name}`, `Earlier: ${stop.name}`)}
                    disabled={index === 0}
                    onClick={() => onMove(index, -1)}
                  >
                    <ChevronRightIcon className="size-4 -rotate-90" />
                  </RowButton>
                  <RowButton
                    label={t(`Później: ${stop.name}`, `Later: ${stop.name}`)}
                    disabled={index === stops.length - 1}
                    onClick={() => onMove(index, 1)}
                  >
                    <ChevronRightIcon className="size-4 rotate-90" />
                  </RowButton>
                  <RowButton
                    label={t(`Usuń przystanek: ${stop.name}`, `Remove stop: ${stop.name}`)}
                    onClick={() => onRemove(stop.placeId)}
                  >
                    <CloseIcon className="size-4" />
                  </RowButton>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

function RowButton({
  label,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        haptic(4);
        onClick();
      }}
      className="grid size-8 shrink-0 place-items-center rounded-full text-tekst-2 transition-[background-color,transform,opacity] hover:bg-tekst/[0.06] active:scale-90 disabled:opacity-30 disabled:active:scale-100"
    >
      {children}
    </button>
  );
}
