"use client";

import type { Interest, LatLng } from "@sawa/shared";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { usePlace, useSelectedPlace } from "@/features/map";
import { haptic, SPRING } from "../lib/device";
import { CardSkeleton, CloseButton, PlaceCardShell } from "./place-card";
import { PlaceCardA } from "./place-card-a";
import { PlaceCardB, PlaceCardBAbove } from "./place-card-b";
import { PlaceCardC } from "./place-card-c";

/** Trzy propozycje karty miejsca do porównania (docs/ui/README.md, 17.10 ok. 15:30). */
type Variant = "a" | "b" | "c";

const VARIANTS: { key: Variant; label: string }[] = [
  { key: "a", label: "A · Arkusz" },
  { key: "b", label: "B · Sawa" },
  { key: "c", label: "C · Wtedy i dziś" },
];

const VARIANT_PARAM = "karta";

export type PlaceSelection = { id: string; position: LatLng | null };

type PlaceCardHostProps = {
  /** Karta pokazuje się tylko na ekranie głównym; na trasie i w innych zakładkach miejsce czeka w URL-u. */
  isActive: boolean;
  interests: Interest[];
  onSelectionChange: (selection: PlaceSelection | null) => void;
  onCoverChange: (px: number) => void;
};

/** Miejsce wybrane na mapie (`?p=` z mapy Antka) i jego karta w wybranym wariancie (`?karta=a|b|c`). */
export function PlaceCardHost({
  isActive,
  interests,
  onSelectionChange,
  onCoverChange,
}: PlaceCardHostProps) {
  const { selectedId, select } = useSelectedPlace();
  const detail = usePlace(selectedId);
  const place = detail.data ?? null;
  const [variant, setVariant] = useState<Variant>(() => {
    const fromUrl = new URLSearchParams(window.location.search).get(VARIANT_PARAM);
    return fromUrl === "b" || fromUrl === "c" ? fromUrl : "a";
  });

  const position = place?.position ?? null;
  const isOpen = isActive && selectedId !== null;

  useEffect(() => {
    onSelectionChange(isOpen && selectedId ? { id: selectedId, position } : null);
  }, [isOpen, selectedId, position, onSelectionChange]);

  const close = useCallback(() => select(null), [select]);

  const changeVariant = useCallback((next: Variant) => {
    haptic();
    setVariant(next);
    const url = new URL(window.location.href);
    url.searchParams.set(VARIANT_PARAM, next);
    window.history.replaceState(window.history.state, "", url);
  }, []);

  return (
    <>
      <AnimatePresence>
        {isOpen && <VariantSwitch key="switch" variant={variant} onChange={changeVariant} />}
      </AnimatePresence>
      <AnimatePresence>
        {isOpen && (
          <PlaceCardShell
            key={`${variant}-${selectedId}`}
            label={place?.name ?? "Miejsce"}
            onClose={close}
            onCoverChange={onCoverChange}
            above={variant === "b" && place ? <PlaceCardBAbove place={place} /> : undefined}
            className={variant === "c" ? "rounded-[28px]" : "rounded-[32px]"}
          >
            {place ? (
              variant === "a" ? (
                <PlaceCardA place={place} interests={interests} onClose={close} />
              ) : variant === "b" ? (
                <PlaceCardB place={place} interests={interests} onClose={close} />
              ) : (
                <PlaceCardC place={place} interests={interests} onClose={close} />
              )
            ) : detail.isError || (detail.isSuccess && !place) ? (
              <div className="flex items-start gap-3 p-5 pt-6">
                <p className="flex-1 text-[15px] text-tekst-2">
                  {detail.isError ? "Nie udało się pobrać miejsca." : "Nie znamy tego miejsca."}{" "}
                  {detail.isError && (
                    <button
                      type="button"
                      onClick={() => detail.refetch()}
                      className="font-bold text-glebia underline"
                    >
                      Spróbuj ponownie
                    </button>
                  )}
                </p>
                <CloseButton onClick={close} />
              </div>
            ) : (
              <CardSkeleton />
            )}
          </PlaceCardShell>
        )}
      </AnimatePresence>
    </>
  );
}

/** Przełącznik propozycji: tylko na czas wyboru wariantu, potem do usunięcia. */
function VariantSwitch({
  variant,
  onChange,
}: {
  variant: Variant;
  onChange: (variant: Variant) => void;
}) {
  return (
    <motion.div
      role="tablist"
      aria-label="Propozycja karty miejsca"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={SPRING}
      className="szklo absolute left-1/2 top-[calc(max(1rem,env(safe-area-inset-top))+60px)] z-30 flex -translate-x-1/2 gap-0.5 rounded-full p-1 md:top-[84px]"
    >
      {VARIANTS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={variant === key}
          onClick={() => onChange(key)}
          className={`relative h-8 whitespace-nowrap rounded-full px-3 text-[13px] font-bold transition-colors ${
            variant === key ? "text-glebia" : "text-tekst-3"
          }`}
        >
          {variant === key && (
            <motion.span
              layoutId="karta-wariant"
              transition={SPRING}
              className="absolute inset-0 rounded-full bg-white shadow-[0_1px_3px_rgba(16,43,42,0.12)]"
            />
          )}
          <span className="relative">{label}</span>
        </button>
      ))}
    </motion.div>
  );
}
