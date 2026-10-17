"use client";

import type { Interest, LatLng } from "@sawa/shared";
import { AnimatePresence } from "motion/react";
import { useCallback, useEffect } from "react";
import { usePlace, useSelectedPlace } from "@/features/map";
import { CardSkeleton, CloseButton, PlaceCardShell } from "./place-card";
import { PlaceDetails } from "./place-details";

export type PlaceSelection = { id: string; position: LatLng | null };

type PlaceCardHostProps = {
  /** Karta pokazuje się tylko na ekranie głównym; na trasie i w innych zakładkach miejsce czeka w URL-u. */
  isActive: boolean;
  interests: Interest[];
  onSelectionChange: (selection: PlaceSelection | null) => void;
  onCoverChange: (px: number) => void;
};

/** Miejsce wybrane na mapie (`?p=` z mapy Antka) i jego karta. */
export function PlaceCardHost({
  isActive,
  interests,
  onSelectionChange,
  onCoverChange,
}: PlaceCardHostProps) {
  const { selectedId, select } = useSelectedPlace();
  const detail = usePlace(selectedId);
  const place = detail.data ?? null;

  const position = place?.position ?? null;
  const isOpen = isActive && selectedId !== null;

  useEffect(() => {
    onSelectionChange(isOpen && selectedId ? { id: selectedId, position } : null);
  }, [isOpen, selectedId, position, onSelectionChange]);

  const close = useCallback(() => select(null), [select]);

  return (
    <AnimatePresence>
      {isOpen && (
        <PlaceCardShell
          key={selectedId}
          label={place?.name ?? "Miejsce"}
          onClose={close}
          onCoverChange={onCoverChange}
          className="rounded-[32px]"
        >
          {place ? (
            <PlaceDetails place={place} interests={interests} onClose={close} />
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
  );
}
