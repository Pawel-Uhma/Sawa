"use client";

import {
  AnimatePresence,
  type MotionValue,
  motion,
  useAnimationControls,
  useTransform,
} from "motion/react";
import Image from "next/image";
import { type CSSProperties, useRef } from "react";
import { haptic, SPRING } from "../lib/device";
import { formatDuration, sliderPercent } from "../lib/format";
import { DURATION_MAX_MIN, DURATION_MIN_MIN, DURATION_STEP_MIN, INTERESTS } from "../lib/mock-data";
import { FloatingCard, Grabber } from "./floating-card";
import { ArrowRightIcon } from "./icons";
import { PrimaryButton } from "./primary-button";

type HomePanelProps = {
  interests: string[];
  durationMin: number;
  onDurationChange: (durationMin: number) => void;
  onEditInterests: () => void;
  onGenerate: () => void;
  planning: boolean;
  planError: string | null;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

const SCALE = ["30 min", "1 h", "2 h", "3 h", "4 h+"];

/** Ekran główny A6: pływająca karta nad paskiem zakładek, Sawa wychyla się zza karty i pyta w dymku. */
export function HomePanel({
  interests,
  durationMin,
  onDurationChange,
  onEditInterests,
  onGenerate,
  planning,
  planError,
  collapsed,
  onCollapsedChange,
}: HomePanelProps) {
  const sawa = useAnimationControls();
  const lastStep = useRef(durationMin);

  const labels = interests
    .map((key) => INTERESTS.find((item) => item.key === key)?.label)
    .filter(Boolean)
    .join(", ");

  // Dotknięcie Sawy: krótkie, sprężyste przechylenie (reakcja, nie dekoracja)
  function poke() {
    haptic(6);
    sawa.start({
      rotate: [0, -6, 4, 0],
      y: [0, -10, 0],
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    });
  }

  return (
    <FloatingCard
      label="Plan przejazdu"
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      peekPx={64}
      className="rounded-[32px] px-[18px] pb-[18px] pt-5 md:px-6 md:pb-6 md:pt-6"
      above={(progress) => <SawaAbove progress={progress} onPoke={poke} sawa={sawa} />}
    >
      <Grabber />
      <div className="flex items-baseline justify-between">
        <span className="etykieta">Przejażdżka</span>
        <span className="relative h-[42px] overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.strong
              key={durationMin}
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -18, opacity: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="block text-[34px] font-extrabold leading-[42px] tracking-[-0.03em] text-glebia tabular-nums"
            >
              {formatDuration(durationMin)}
            </motion.strong>
          </AnimatePresence>
        </span>
      </div>

      <input
        type="range"
        className="suwak mt-2"
        aria-label="Czas przejażdżki"
        aria-valuetext={formatDuration(durationMin)}
        min={DURATION_MIN_MIN}
        max={DURATION_MAX_MIN}
        step={DURATION_STEP_MIN}
        value={durationMin}
        onChange={(event) => {
          const value = Number(event.target.value);
          if (value !== lastStep.current) haptic(4);
          lastStep.current = value;
          onDurationChange(value);
        }}
        style={{ "--postep": `${sliderPercent(durationMin)}%` } as CSSProperties}
      />
      <div className="flex justify-between text-xs font-semibold text-tekst-3">
        {SCALE.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[13px] text-tekst-2">
        <span className="shrink-0">Tematy:</span>
        <b className="min-w-0 truncate font-bold text-tekst">{labels || "wszystkie"}</b>
        <button
          type="button"
          onClick={onEditInterests}
          className="-mr-2 ml-auto shrink-0 rounded-full px-2 py-1.5 font-bold text-glebia transition-[opacity,background-color] hover:bg-mieta-jasna active:opacity-60"
        >
          Zmień
        </button>
      </div>

      <PrimaryButton onClick={onGenerate} disabled={planning} className="mt-4">
        {planning ? "Układam trasę…" : "Wyznacz trasę"}
        <ArrowRightIcon className="size-5" />
      </PrimaryButton>
      {planError && (
        <p role="alert" className="mt-2 text-center text-sm text-zinc-600">
          {planError}
        </p>
      )}
    </FloatingCard>
  );
}

type SawaAboveProps = {
  progress: MotionValue<number>;
  onPoke: () => void;
  sawa: ReturnType<typeof useAnimationControls>;
};

/** Sawa i dymek nad kartą. Przy zwijaniu karty znikają szybciej niż karta jedzie w dół. */
function SawaAbove({ progress, onPoke, sawa }: SawaAboveProps) {
  const opacity = useTransform(progress, [0, 0.5], [1, 0]);
  const scale = useTransform(progress, [0, 0.5], [1, 0.9]);

  return (
    <motion.div
      style={{ opacity, scale }}
      className="pointer-events-none relative h-[120px] origin-bottom md:h-[132px]"
    >
      <motion.button
        type="button"
        aria-label="Sawa"
        onClick={onPoke}
        initial={{ y: 70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...SPRING, delay: 0.12 }}
        className="pointer-events-auto absolute -bottom-[34px] left-1 w-[124px] origin-bottom md:w-[136px]"
      >
        <motion.div animate={sawa} className="origin-bottom">
          <Image
            src="/sawa-32.png"
            alt=""
            width={568}
            height={862}
            priority
            draggable={false}
            className="h-auto w-full drop-shadow-[0_10px_14px_rgba(16,43,42,0.22)]"
          />
        </motion.div>
      </motion.button>

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...SPRING, delay: 0.24 }}
        style={{ transformOrigin: "0% 100%" }}
        className="szklo absolute bottom-6 left-[130px] right-1 rounded-[20px_20px_20px_6px] px-4 py-3 md:left-[142px]"
      >
        <p className="text-[19px] font-extrabold leading-tight tracking-[-0.02em]">
          Ile masz dziś czasu?
        </p>
        <p className="mt-0.5 text-[13px] leading-snug text-tekst-2">
          Ułożę przejazd i opowiem, co mijasz za oknem.
        </p>
      </motion.div>
    </motion.div>
  );
}
