"use client";

import type { LatLng } from "@sawa/shared";
import { AnimatePresence } from "motion/react";
import { useCallback, useEffect } from "react";
import { useT } from "@/features/i18n";
import { usePlace, useSelectedPlace } from "@/features/map";
import type { Listener } from "../lib/api-data";
import { CardSkeleton, CloseButton, PlaceCardShell } from "./place-card";
import { PlaceDetails } from "./place-details";

export type PlaceSelection = { id: string; position: LatLng | null };

type PlaceCardHostProps = {
  /** Karta pokazuje się tylko na ekranie głównym; na trasie i w innych zakładkach miejsce czeka w URL-u. */
  isActive: boolean;
  listener: Listener;
  onSelectionChange: (selection: PlaceSelection | null) => void;
  onCoverChange: (px: number) => void;
  /** „Jedź tutaj” w karcie: miejsce staje się celem przejażdżki. */
  onRideTo: (name: string, point: LatLng) => void;
};

/** Miejsce wybrane na mapie (`?p=` z mapy Antka) i jego karta. */
export function PlaceCardHost({
  isActive,
  listener,
  onSelectionChange,
  onCoverChange,
  onRideTo,
}: PlaceCardHostProps) {
  const t = useT();
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
          label={place?.name ?? t("Miejsce", "Place")}
          onClose={close}
          onCoverChange={onCoverChange}
          className="rounded-[32px]"
        >
          {place ? (
            <PlaceDetails
              place={place}
              listener={listener}
              onClose={close}
              onRideTo={
                position
                  ? (name) => {
                      onRideTo(name, position);
                      close();
                    }
                  : undefined
              }
            />
          ) : detail.isError || (detail.isSuccess && !place) ? (
            <div className="flex items-start gap-3 p-5 pt-6">
              <p className="flex-1 text-[15px] text-tekst-2">
                {detail.isError
                  ? t("Nie udało się pobrać miejsca.", "Couldn't load this place.")
                  : t("Nie znamy tego miejsca.", "We don't know this place.")}{" "}
                {detail.isError && (
                  <button
                    type="button"
                    onClick={() => detail.refetch()}
                    className="font-bold text-glebia underline"
                  >
                    {t("Spróbuj ponownie", "Try again")}
                  </button>
                )}
              </p>
              <CloseButton onClick={close} />
            </div>
          ) : (
            <CardSkeleton onClose={close} />
          )}
        </PlaceCardShell>
      )}
    </AnimatePresence>
  );
}
