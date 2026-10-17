"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { setLang, useLang, useT } from "../hooks/use-lang";
import { LANG_LABELS, LANGS } from "../lib/lang";

const THUMB_SPRING = { type: "spring", bounce: 0.15, duration: 0.4 } as const;

/** Polski / English, the same segmented control as ThemeSwitch. */
export function LangSwitch({ className = "" }: { className?: string }) {
  const lang = useLang();
  const t = useT();
  const isReducedMotion = useReducedMotion();
  const groupName = useId();

  return (
    <fieldset className={`grid grid-cols-2 rounded-[11px] bg-tekst/[0.07] p-0.5 ${className}`}>
      <legend className="sr-only">{t("Język", "Language")}</legend>
      {LANGS.map((option) => {
        const isSelected = option === lang;
        return (
          <label
            key={option}
            lang={option}
            className={`relative flex h-8 cursor-pointer items-center justify-center rounded-[9px] text-[13px] font-semibold transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-glebia ${
              isSelected ? "text-tekst" : "text-tekst-2"
            }`}
          >
            <input
              type="radio"
              name={groupName}
              value={option}
              checked={isSelected}
              onChange={() => setLang(option)}
              className="sr-only"
            />
            {isSelected && (
              <motion.span
                layoutId={groupName}
                transition={isReducedMotion ? { duration: 0 } : THUMB_SPRING}
                className="absolute inset-0 rounded-[9px] bg-powierzchnia shadow-[0_1px_3px_rgba(16,43,42,0.14)]"
              />
            )}
            <span className="relative">{LANG_LABELS[option]}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
