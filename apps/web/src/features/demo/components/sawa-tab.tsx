"use client";

import { useMemo } from "react";
import { formatWhen } from "../lib/format";
import type { PlaceMemory } from "../lib/memory";
import type { MockStop } from "../lib/mock-data";
import type { StoryPlayer } from "../lib/story-player";
import { FloatingCard, Grabber } from "./floating-card";
import { PauseIcon, PlayIcon, SkipNextIcon, SkipPrevIcon } from "./icons";
import { SawaHead } from "./logo";

type SawaTabProps = {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  /** Punkty trasy; pusta lista znaczy, że nie ma jeszcze trasy. */
  stops: MockStop[];
  activeIndex: number;
  player: StoryPlayer;
  /** Co Sawa już opowiedziała, po id miejsca (lib/memory.ts). */
  places: Record<string, PlaceMemory>;
  onPrev: () => void;
  onNext: () => void;
};

/** Podgląd podcastu: co Sawa mówi teraz, sterowanie i lista miejsc, o których już opowiedziała. */
export function SawaTab({
  collapsed,
  onCollapsedChange,
  stops,
  activeIndex,
  player,
  places,
  onPrev,
  onNext,
}: SawaTabProps) {
  const stop = stops[activeIndex];
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < stops.length - 1;
  const words = useMemo(() => player.text?.split(/\s+/) ?? [], [player.text]);
  const spoken = Math.floor((player.progress / 100) * words.length);
  const told = useMemo(() => Object.entries(places).sort(([, a], [, b]) => b.at - a.at), [places]);

  const status = !stop
    ? "Ułóż trasę, to coś opowiem"
    : player.loading
      ? "Szykuje opowieść…"
      : player.failed
        ? "Tym razem cisza"
        : player.isPlaying
          ? "Opowiada"
          : "Wstrzymana";

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
        <SawaHead className="size-14" />
        <div className="min-w-0">
          <h2 className="text-[20px] font-extrabold leading-tight tracking-[-0.02em]">Sawa</h2>
          <p className="mt-0.5 text-sm font-semibold text-glebia">{status}</p>
        </div>
      </div>

      <div className="flex max-h-[55vh] flex-col gap-5 overflow-y-auto overscroll-contain md:max-h-[70vh]">
        {stop && (
          <section aria-label="Teraz opowiada" className="flex flex-col gap-3">
            <div>
              <p className="etykieta">
                Punkt {activeIndex + 1} z {stops.length} · po ok. {stop.etaMin} min
              </p>
              <h3 className="text-[17px] font-extrabold leading-snug tracking-[-0.01em]">
                {stop.name}
              </h3>
            </div>

            {/* Transkrypcja: słowa już wypowiedziane są ciemniejsze, reszta jaśniejsza */}
            <p className="min-h-[72px] text-[15px] leading-relaxed text-tekst-3">
              {player.text
                ? words.map((word, index) => (
                    <span
                      // Słowa nie zmieniają się w trakcie opowieści, więc indeks jest kluczem
                      // biome-ignore lint/suspicious/noArrayIndexKey: stała lista słów
                      key={index}
                      className={index < spoken ? "text-tekst" : undefined}
                    >
                      {word}{" "}
                    </span>
                  ))
                : player.failed
                  ? "Tym razem Sawa nic nie powie."
                  : "Sawa przypomina sobie, co wie o tym miejscu…"}
            </p>

            <div
              role="progressbar"
              aria-label="Postęp opowieści"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(player.progress)}
              className="h-1.5 overflow-hidden rounded-full bg-tlo-2"
            >
              <div
                className="h-full origin-left rounded-full bg-glebia"
                style={{ transform: `scaleX(${player.progress / 100})` }}
              />
            </div>

            <div className="flex items-center justify-center gap-5">
              <button
                type="button"
                onClick={onPrev}
                disabled={!hasPrev}
                aria-label="Poprzedni punkt"
                className="flex size-12 items-center justify-center rounded-full text-tekst transition-[transform,opacity,background-color] hover:bg-tlo-2 active:scale-[0.92] disabled:opacity-30"
              >
                <SkipPrevIcon className="size-6" />
              </button>
              <button
                type="button"
                onClick={player.toggle}
                aria-label={player.isPlaying ? "Pauza" : "Odtwarzaj"}
                className="flex size-16 items-center justify-center rounded-full bg-glebia text-white shadow-[0_6px_16px_rgba(23,112,111,0.3)] transition-[transform,background-color] hover:bg-glebia-ciemna active:scale-[0.92]"
              >
                {player.isPlaying ? (
                  <PauseIcon className="size-7" />
                ) : (
                  <PlayIcon className="size-7 translate-x-[1px]" />
                )}
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={!hasNext}
                aria-label="Następny punkt"
                className="flex size-12 items-center justify-center rounded-full text-tekst transition-[transform,opacity,background-color] hover:bg-tlo-2 active:scale-[0.92] disabled:opacity-30"
              >
                <SkipNextIcon className="size-6" />
              </button>
            </div>

            <button
              type="button"
              onClick={player.more}
              disabled={!player.text}
              className="h-11 rounded-full bg-mieta-jasna text-sm font-bold text-glebia-ciemna transition-[transform,opacity] hover:bg-mieta active:scale-[0.97] disabled:opacity-40"
            >
              Opowiedz więcej o tym miejscu
            </button>
          </section>
        )}

        <section aria-label="Co już opowiedziała" className="flex flex-col gap-2">
          <p className="etykieta">Co już opowiedziała</p>
          {told.length === 0 ? (
            <p className="text-sm leading-snug text-tekst-2">
              Po pierwszej opowieści zobaczysz tu miejsca, o których mówiła, i kiedy.
            </p>
          ) : (
            <ul className="flex flex-col">
              {told.map(([id, place]) => (
                <li
                  key={id}
                  className="flex items-center justify-between gap-3 border-t border-tlo-2 py-2.5 text-sm"
                >
                  <span className="min-w-0 truncate font-semibold">
                    {place.name ?? "Miejsce z trasy"}
                  </span>
                  <time
                    dateTime={new Date(place.at).toISOString()}
                    className="shrink-0 text-tekst-3 tabular-nums"
                  >
                    {formatWhen(place.at)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </FloatingCard>
  );
}
