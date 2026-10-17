"use client";

import Image from "next/image";
import { FloatingCard, Grabber } from "./floating-card";
import { ArrowRightIcon } from "./icons";
import { PrimaryButton } from "./primary-button";
import type { Tab } from "./tab-bar";

type TabPlaceholderProps = {
  tab: Exclude<Tab, "map">;
  hasRoute: boolean;
  onOpenRoute: () => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

// Zakładki Przejażdżki i Sawa: puste stany do czasu T-34 (czat) i historii przejażdżek.
export function TabPlaceholder({
  tab,
  hasRoute,
  onOpenRoute,
  collapsed,
  onCollapsedChange,
}: TabPlaceholderProps) {
  const isRides = tab === "rides";

  return (
    <FloatingCard
      label={isRides ? "Przejażdżki" : "Sawa"}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      peekPx={88}
      className="flex flex-col gap-4 rounded-[32px] p-5 md:p-6"
    >
      <Grabber />
      <div className="flex items-center gap-3">
        <Image
          src="/sawa-32.png"
          alt=""
          width={568}
          height={862}
          draggable={false}
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
    </FloatingCard>
  );
}
