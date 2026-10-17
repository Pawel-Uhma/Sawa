"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { SPRING } from "../lib/device";

export type SawaPose = "macha" | "mapa" | "mysli" | "sekret" | "radosc";

export const SAWA_POSES: SawaPose[] = ["macha", "mapa", "mysli", "sekret", "radosc"];

export const sawaSrc = (pose: SawaPose) => `/onboarding/sawa-${pose}.webp`;

type SawaGuideProps = {
  pose: SawaPose;
  say: string;
  hero: boolean;
};

// Sawa z dymkiem. Na powitaniu duża (hero), w pytaniach mała obok dymka; na desktopie zawsze duża w lewej kolumnie.
export function SawaGuide({ pose, say, hero }: SawaGuideProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      layout={!reduce}
      transition={SPRING}
      className={`flex md:flex-col md:items-center md:gap-6 ${
        hero ? "flex-col items-center gap-3" : "flex-row items-end gap-3"
      }`}
    >
      <motion.div
        layout={!reduce}
        transition={SPRING}
        className={`relative shrink-0 md:size-80 lg:size-96 ${hero ? "size-56" : "size-24"}`}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={pose}
            className="absolute inset-0"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            transition={SPRING}
          >
            <Image
              src={sawaSrc(pose)}
              alt=""
              width={720}
              height={720}
              priority={pose === "macha"}
              className="size-full object-contain drop-shadow-[0_18px_24px_rgba(16,43,42,0.14)] dark:brightness-[0.82]"
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Dymek rośnie od ogonka, czyli od Sawy (źródło wypowiedzi). */}
      <div className={`relative min-w-0 md:w-full md:max-w-sm ${hero ? "w-full" : "mb-5 flex-1"}`}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.p
            key={say}
            aria-live="polite"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
            transition={SPRING}
            className={`relative rounded-3xl bg-powierzchnia px-4 py-3 text-[15px] font-semibold leading-snug text-tekst shadow-[0_6px_20px_rgba(16,43,42,0.08)] md:origin-top md:text-center md:text-base ${
              hero ? "origin-top text-center" : "origin-bottom-left rounded-bl-md md:rounded-bl-3xl"
            }`}
          >
            {say}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
