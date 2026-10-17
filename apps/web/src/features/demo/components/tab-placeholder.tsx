"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { SPRING } from "../lib/device";
import { ArrowRightIcon } from "./icons";
import { PrimaryButton } from "./primary-button";
import type { Tab } from "./tab-bar";

type TabPlaceholderProps = {
  tab: Exclude<Tab, "map">;
  hasRoute: boolean;
  onOpenRoute: () => void;
};

// Zakładki Przejażdżki i Sawa: puste stany do czasu T-34 (czat) i historii przejażdżek.
export function TabPlaceholder({ tab, hasRoute, onOpenRoute }: TabPlaceholderProps) {
  const isRides = tab === "rides";

  return (
    <motion.section
      aria-label={isRides ? "Przejażdżki" : "Sawa"}
      initial={{ opacity: 0, y: 48 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 48 }}
      transition={SPRING}
      className="karta absolute inset-x-3 bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+76px)] z-20 flex flex-col gap-4 rounded-[32px] p-5 md:inset-x-auto md:bottom-6 md:left-6 md:w-[360px] lg:w-[400px] md:p-6"
    >
      <div className="flex items-center gap-3">
        <Image
          src="/sawa-32.png"
          alt=""
          width={568}
          height={862}
          className="h-16 w-auto shrink-0"
        />
        <div>
          <h2 className="text-[20px] font-extrabold leading-tight tracking-[-0.02em]">
            {isRides ? "Twoje przejażdżki" : "Pogadaj z Sawą"}
          </h2>
          <p className="mt-0.5 text-sm leading-snug text-tekst-2">
            {isRides
              ? hasRoute
                ? "Masz jedną trasę z dzisiaj."
                : "Tu zobaczysz trasy, które przejedziesz."
              : "Czat z Sawą pojawi się wkrótce."}
          </p>
        </div>
      </div>
      {isRides && hasRoute && (
        <PrimaryButton onClick={onOpenRoute}>
          Wróć do trasy
          <ArrowRightIcon className="size-5" />
        </PrimaryButton>
      )}
    </motion.section>
  );
}
