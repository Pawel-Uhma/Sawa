"use client";

import {
  animate,
  type MotionValue,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useT } from "@/features/i18n";
import { haptic, project, SPRING, SPRING_FLICK, useIsDesktop } from "../lib/device";
import { rubberband, useVerticalDrag } from "../lib/gesture";

// Odstęp między dołem karty a dołem ekranu (bottom-3).
const GAP_PX = 12;

type FloatingCardProps = {
  label: string;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  /** Ile pikseli górnej części karty zostaje na ekranie po zwinięciu. */
  peekPx: number;
  /** Co wystaje nad kartą (Sawa z dymkiem). Dostaje postęp zwijania 0–1, żeby mogło znikać razem z kartą. */
  above?: (progress: MotionValue<number>) => ReactNode;
  className?: string;
  children: ReactNode;
};

/**
 * Pływająca karta na dole ekranu. Na telefonie ściąga się ją palcem w dół i chowa za krawędź,
 * zostawiając nagłówek; tapnięcie albo ruch w górę ją wysuwa. Na desktopie stoi w miejscu.
 */
export function FloatingCard({
  label,
  collapsed,
  onCollapsedChange,
  peekPx,
  above,
  className = "",
  children,
}: FloatingCardProps) {
  const t = useT();
  const isDesktop = useIsDesktop();
  const reduce = useReducedMotion();
  const dragRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(0);
  const y = useMotionValue(0);
  const base = useRef(0);
  const range = isDesktop ? 0 : Math.max(0, cardHeight + GAP_PX - peekPx);
  // Przycinamy dopiero, gdy karta zjeżdża: w spoczynku cień pod kartą zostaje cały.
  const [isClipped, setIsClipped] = useState(false);
  useMotionValueEvent(y, "change", (value) => setIsClipped(value > 1));
  const progress = useTransform(y, (value) =>
    range > 0 ? Math.min(1, Math.max(0, value / range)) : 0,
  );

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const observer = new ResizeObserver(() => setCardHeight(card.offsetHeight));
    observer.observe(card);
    setCardHeight(card.offsetHeight);
    return () => observer.disconnect();
  }, []);

  // Stan z zewnątrz (i zmiana wysokości karty) przesuwa kartę sprężyną od bieżącego miejsca.
  useEffect(() => {
    const target = collapsed ? range : 0;
    if (reduce) {
      y.set(target);
      return;
    }
    const animation = animate(y, target, SPRING);
    return () => animation.stop();
  }, [collapsed, range, reduce, y]);

  useVerticalDrag(dragRef, {
    shouldStart: () => !isDesktop && range > 0,
    onStart: () => {
      y.stop();
      base.current = y.get();
    },
    onMove: (dy) => {
      const raw = base.current + dy;
      if (raw < 0) y.set(-rubberband(-raw, cardHeight));
      else if (raw > range) y.set(range + rubberband(raw - range, cardHeight));
      else y.set(raw);
    },
    onEnd: (velocity) => {
      const landing = y.get() + project(velocity);
      const next = landing > range / 2;
      if (next !== collapsed) {
        // Efekt wyżej przejmie ruch; sprężyna startuje z bieżącej prędkości wartości.
        haptic();
        onCollapsedChange(next);
        return;
      }
      // Ten sam cel: efekt się nie powtórzy, więc dociągamy sami, z prędkością palca.
      animate(y, next ? range : 0, reduce ? { duration: 0 } : { ...SPRING_FLICK, velocity });
    },
  });

  return (
    // Opakowanie kończy się nad wskaźnikiem home i przycina zjeżdżającą kartę.
    <div
      className={`pointer-events-none absolute inset-x-0 top-0 bottom-[env(safe-area-inset-bottom)] z-20 md:bottom-0 md:overflow-visible ${
        isClipped ? "[overflow-y:clip]" : ""
      }`}
    >
      <motion.section
        aria-label={label}
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 48 }}
        transition={SPRING}
        className="absolute inset-x-3 bottom-3 md:inset-x-auto md:bottom-6 md:left-6 md:w-[360px] lg:w-[400px]"
      >
        <motion.div
          ref={dragRef}
          style={{ y }}
          className="pointer-events-auto touch-none md:touch-auto"
        >
          {above && <div inert={collapsed && !isDesktop}>{above(progress)}</div>}
          <div ref={cardRef} className={`karta relative ${className}`}>
            {children}
            {/* Zwinięta karta: cała powierzchnia to jeden przycisk „wysuń” */}
            {collapsed && !isDesktop && (
              <button
                type="button"
                aria-label={t(`Rozwiń: ${label}`, `Expand: ${label}`)}
                onClick={() => {
                  haptic();
                  onCollapsedChange(false);
                }}
                className="absolute inset-0 rounded-[inherit]"
              />
            )}
          </div>
        </motion.div>
      </motion.section>
    </div>
  );
}

/** Uchwyt na górze karty: pokazuje, że kartę można ściągnąć. */
export function Grabber() {
  return (
    <span
      aria-hidden="true"
      className="absolute left-1/2 top-2 h-[5px] w-9 -translate-x-1/2 rounded-full bg-tekst/15 md:hidden"
    />
  );
}
