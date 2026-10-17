"use client";

import Image from "next/image";
import { FloatingCard, Grabber } from "./floating-card";

type TabPlaceholderProps = {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

// Zakładka Sawa: pusty stan do czasu T-34 (czat).
export function TabPlaceholder({ collapsed, onCollapsedChange }: TabPlaceholderProps) {
  return (
    <FloatingCard
      label="Sawa"
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
            Pogadaj z Sawą
          </h2>
          <p className="mt-0.5 text-sm leading-snug text-tekst-2">
            Czat z Sawą pojawi się wkrótce.
          </p>
        </div>
      </div>
    </FloatingCard>
  );
}
