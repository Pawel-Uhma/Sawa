"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { SPRING } from "../lib/device";
import { type Choice, INTERESTS, interestIcon } from "../lib/onboarding";

// Wybory używane w onboardingu i w modalach edycji profilu (profile-modal.tsx).

type ChoiceListProps = {
  label: string;
  options: Choice[];
  value: string | null;
  onPick: (key: string) => void;
};

export function ChoiceList({ label, options, value, onPick }: ChoiceListProps) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-3">
      {options.map((option) => {
        const isOn = value === option.key;
        return (
          <motion.button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={isOn}
            onClick={() => onPick(option.key)}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", bounce: 0, duration: 0.2 }}
            className={`flex min-h-[72px] items-center gap-4 rounded-3xl border-2 bg-white p-3 pr-4 text-left transition-[border-color,background-color,box-shadow] duration-200 hover:shadow-[0_6px_20px_rgba(16,43,42,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glebia md:min-h-20 md:p-4 ${
              isOn ? "border-glebia bg-mieta-jasna" : "border-transparent"
            }`}
          >
            <motion.span
              className="block shrink-0"
              animate={{ scale: isOn ? 1.08 : 1, rotate: isOn ? -4 : 0 }}
              transition={SPRING}
            >
              <Image
                src={`/onboarding/${option.icon}.webp`}
                alt=""
                width={64}
                height={64}
                className="size-12 md:size-14"
              />
            </motion.span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-base font-bold md:text-lg">{option.label}</span>
              <span className="text-sm text-tekst-2">{option.hint}</span>
            </span>
            <Check on={isOn} />
          </motion.button>
        );
      })}
    </div>
  );
}

type InterestPickerProps = {
  picked: string[];
  onToggle: (key: string) => void;
};

export function InterestPicker({ picked, onToggle }: InterestPickerProps) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 md:gap-3" aria-label="Zainteresowania">
      {INTERESTS.map((item) => {
        const isOn = picked.includes(item.key);
        return (
          <li key={item.key}>
            <motion.button
              type="button"
              aria-pressed={isOn}
              onClick={() => onToggle(item.key)}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", bounce: 0, duration: 0.2 }}
              className={`flex h-full w-full flex-col items-start gap-2 rounded-3xl border-2 bg-white p-3 text-left transition-[border-color,background-color,box-shadow] duration-200 hover:shadow-[0_6px_20px_rgba(16,43,42,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glebia md:gap-3 md:p-4 ${
                isOn ? "border-glebia bg-mieta-jasna" : "border-transparent"
              }`}
            >
              <span className="flex w-full items-start justify-between">
                <motion.span
                  className="block"
                  animate={{ scale: isOn ? 1.08 : 1, rotate: isOn ? -4 : 0 }}
                  transition={SPRING}
                >
                  <Image
                    src={interestIcon(item.key)}
                    alt=""
                    width={64}
                    height={64}
                    className="size-14 md:size-16"
                  />
                </motion.span>
                <Check on={isOn} />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-base font-bold leading-tight md:text-lg">{item.label}</span>
                <span className="text-[13px] leading-snug text-tekst-2 md:text-sm">
                  {item.hint}
                </span>
              </span>
            </motion.button>
          </li>
        );
      })}
    </ul>
  );
}

export function Check({ on }: { on: boolean }) {
  return (
    <span
      className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 ${
        on ? "border-glebia bg-glebia" : "border-tekst/15"
      }`}
      aria-hidden="true"
    >
      <AnimatePresence initial={false}>
        {on && (
          <motion.svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
          >
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </span>
  );
}
