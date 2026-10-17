"use client";

import type { Travel } from "@sawa/shared";
import {
  AnimatePresence,
  type MotionValue,
  motion,
  useAnimationControls,
  useTransform,
} from "motion/react";
import Image from "next/image";
import { type CSSProperties, useRef, useState } from "react";
import { useDestinationSearch } from "../lib/destination-search";
import { haptic, SPRING } from "../lib/device";
import { formatDuration } from "../lib/format";
import { INTERESTS } from "../lib/onboarding";
import { durationStops, stopPercent } from "../lib/ride-duration";
import { DESTINATION_PRESETS, type RideEnd, type RideEndType } from "../lib/ride-end";
import { FloatingCard, Grabber } from "./floating-card";
import { ArrowRightIcon, PinIcon } from "./icons";
import { PrimaryButton } from "./primary-button";

type HomePanelProps = {
  interests: string[];
  durationMin: number;
  /** Czas najszybszej drogi do wybranego celu; suwak nie schodzi poniżej niego (T-110). */
  floorMin: number | null;
  onDurationChange: (durationMin: number) => void;
  travel: Travel;
  onTravelChange: (travel: Travel) => void;
  rideEnd: RideEnd;
  onRideEndTypeChange: (type: RideEndType) => void;
  onRideEndChange: (end: RideEnd) => void;
  onEditInterests: () => void;
  onGenerate: () => void;
  planning: boolean;
  planError: string | null;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

/** Podpisy pod suwakiem w miejscach ich wartości (suwak jest liniowy, więc 1 h nie leży w 1/4). */
const SCALE = [5, 30, 60, 120, 180, 240];

/** Środek gałki suwaka (30 px) dla danej wartości: tor zaczyna się i kończy pół gałki od krawędzi. */
function thumbCenter(durationMin: number, stops: readonly number[]): string {
  return `calc(15px + (100% - 30px) * ${stopPercent(durationMin, stops) / 100})`;
}

const TRAVEL_OPTIONS: { type: Travel; label: string }[] = [
  { type: "walk", label: "Pieszo" },
  { type: "transit", label: "Komunikacją" },
];

const END_OPTIONS: { type: RideEndType; label: string }[] = [
  { type: "loop", label: "Wracam tu" },
  { type: "destination", label: "Do celu" },
];

/** Ekran główny A6: pływająca karta nad paskiem zakładek, Sawa wychyla się zza karty i pyta w dymku. */
export function HomePanel({
  interests,
  durationMin,
  floorMin,
  onDurationChange,
  travel,
  onTravelChange,
  rideEnd,
  onRideEndTypeChange,
  onRideEndChange,
  onEditInterests,
  onGenerate,
  planning,
  planError,
  collapsed,
  onCollapsedChange,
}: HomePanelProps) {
  const sawa = useAnimationControls();
  const lastStep = useRef(durationMin);
  const stops = durationStops(floorMin);
  // Przy najszybszej drodze pierwszy podpis to ta droga, a krótsze wartości znikają z podpisów.
  const scale =
    floorMin === null ? SCALE : [floorMin, ...SCALE.filter((value) => value > floorMin)];

  const labels = interests
    .map((key) => INTERESTS.find((item) => item.key === key)?.label)
    .filter(Boolean)
    .join(", ");

  // Dotknięcie Sawy: krótkie, sprężyste przechylenie (reakcja, nie dekoracja)
  function poke() {
    haptic(6);
    sawa.start({
      rotate: [0, -6, 4, 0],
      y: [0, -10, 0],
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    });
  }

  return (
    <FloatingCard
      label="Plan przejazdu"
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      peekPx={64}
      className="rounded-[32px] px-[18px] pb-[18px] pt-5 md:px-6 md:pb-6 md:pt-6"
      above={(progress) => <SawaAbove progress={progress} onPoke={poke} sawa={sawa} />}
    >
      <Grabber />
      <div className="flex items-baseline justify-between">
        <span className="etykieta">Przejażdżka</span>
        <span className="relative h-[42px] overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.strong
              key={durationMin}
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -18, opacity: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="block text-[34px] font-extrabold leading-[42px] tracking-[-0.03em] text-glebia tabular-nums"
            >
              {formatDuration(durationMin)}
            </motion.strong>
          </AnimatePresence>
        </span>
      </div>

      <input
        type="range"
        className="suwak mt-2"
        aria-label="Czas przejażdżki"
        aria-valuetext={formatDuration(durationMin)}
        min={0}
        max={stops.length - 1}
        step={1}
        value={stops.indexOf(durationMin)}
        onChange={(event) => {
          const value = stops[Number(event.target.value)];
          if (value !== lastStep.current) haptic(4);
          lastStep.current = value;
          onDurationChange(value);
        }}
        style={{ "--postep": thumbCenter(durationMin, stops) } as CSSProperties}
      />
      <div aria-hidden className="relative h-4 text-xs font-semibold text-tekst-3">
        {scale.map((value, index) => (
          <span
            key={value}
            // Skrajne podpisy przy krawędziach, żeby nie wystawały poza kartę.
            style={
              index === 0
                ? { left: 0 }
                : index === scale.length - 1
                  ? { right: 0 }
                  : { left: thumbCenter(value, stops) }
            }
            className={`absolute top-0 whitespace-nowrap tabular-nums transition-colors duration-200 ${
              index === 0 || index === scale.length - 1 ? "" : "-translate-x-1/2"
            } ${value === durationMin ? "text-glebia" : ""}`}
          >
            {formatDuration(value)}
          </span>
        ))}
      </div>
      {floorMin !== null && (
        <p className="mt-2 text-xs text-tekst-2">
          Najszybciej do tego celu: {formatDuration(floorMin)}. Krócej się nie da.
        </p>
      )}

      <TravelPicker travel={travel} onChange={onTravelChange} />

      <RideEndPicker
        rideEnd={rideEnd}
        onTypeChange={onRideEndTypeChange}
        onChange={onRideEndChange}
      />

      <div className="mt-3 flex items-center gap-1.5 text-[13px] text-tekst-2">
        <span className="shrink-0">Tematy:</span>
        <b className="min-w-0 truncate font-bold text-tekst">{labels || "wszystkie"}</b>
        <button
          type="button"
          onClick={onEditInterests}
          className="-mr-2 ml-auto shrink-0 rounded-full px-2 py-1.5 font-bold text-glebia transition-[opacity,background-color] hover:bg-mieta-jasna active:opacity-60"
        >
          Zmień
        </button>
      </div>

      <PrimaryButton onClick={onGenerate} disabled={planning} className="mt-4">
        {planning ? "Układam trasę…" : "Wyznacz trasę"}
        <ArrowRightIcon className="size-5" />
      </PrimaryButton>
      {planError && (
        <p role="alert" className="mt-2 text-center text-sm text-zinc-600">
          {planError}
        </p>
      )}
    </FloatingCard>
  );
}

type TravelPickerProps = {
  travel: Travel;
  onChange: (travel: Travel) => void;
};

/** Pieszo albo komunikacją: przełącznik segmentowy jak koniec trasy. */
function TravelPicker({ travel, onChange }: TravelPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Jak jedziesz"
      className="mt-4 flex rounded-[14px] bg-tekst/[0.06] p-[3px]"
    >
      {TRAVEL_OPTIONS.map((option) => {
        const isActive = option.type === travel;
        return (
          // biome-ignore lint/a11y/useSemanticElements: segmentowy przełącznik, nie lista radio
          <button
            key={option.type}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => {
              if (isActive) return;
              haptic(4);
              onChange(option.type);
            }}
            className={`relative h-[34px] flex-1 rounded-[11px] text-[13px] font-semibold transition-colors duration-200 active:scale-[0.97] ${
              isActive ? "text-tekst" : "text-tekst-2"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="segment-sposob"
                transition={SPRING}
                className="absolute inset-0 rounded-[inherit] bg-white shadow-[0_1px_3px_rgba(16,43,42,0.12)]"
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

type RideEndPickerProps = {
  rideEnd: RideEnd;
  onTypeChange: (type: RideEndType) => void;
  onChange: (end: RideEnd) => void;
};

/** Koniec trasy: przełącznik segmentowy, a przy „Do celu” cele do stuknięcia i podpowiedź o mapie. */
function RideEndPicker({ rideEnd, onTypeChange, onChange }: RideEndPickerProps) {
  const destination = rideEnd.type === "destination" ? rideEnd : null;
  const isCustom =
    destination !== null && !DESTINATION_PRESETS.some((preset) => preset.name === destination.name);

  return (
    <div className="mt-4">
      <div
        role="radiogroup"
        aria-label="Gdzie kończysz"
        className="flex rounded-[14px] bg-tekst/[0.06] p-[3px]"
      >
        {END_OPTIONS.map((option) => {
          const isActive = option.type === rideEnd.type;
          return (
            // biome-ignore lint/a11y/useSemanticElements: segmentowy przełącznik, nie lista radio
            <button
              key={option.type}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => {
                if (isActive) return;
                haptic(4);
                onTypeChange(option.type);
              }}
              className={`relative h-[34px] flex-1 rounded-[11px] text-[13px] font-semibold transition-colors duration-200 active:scale-[0.97] ${
                isActive ? "text-tekst" : "text-tekst-2"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="segment-konca"
                  transition={SPRING}
                  className="absolute inset-0 rounded-[inherit] bg-white shadow-[0_1px_3px_rgba(16,43,42,0.12)]"
                />
              )}
              <span className="relative">{option.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {destination && (
          <motion.div
            key="cele"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.35 }}
            className="overflow-hidden"
          >
            <DestinationSearch onPick={onChange} />
            <div className="-mx-[18px] flex gap-2 overflow-x-auto px-[18px] pt-2.5 [scrollbar-width:none] md:-mx-6 md:px-6">
              {isCustom && (
                <span className="flex h-8 max-w-[220px] shrink-0 items-center rounded-full bg-glebia px-3 text-[13px] font-semibold text-white">
                  <span className="truncate">{destination.name}</span>
                </span>
              )}
              {DESTINATION_PRESETS.map((preset) => {
                const isActive = preset.name === destination.name;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      if (isActive) return;
                      haptic(4);
                      onChange({ type: "destination", name: preset.name, point: preset.point });
                    }}
                    className={`h-8 shrink-0 rounded-full px-3 text-[13px] font-semibold transition-[transform,background-color,color] active:scale-[0.96] ${
                      isActive ? "bg-glebia text-white" : "bg-mieta-jasna text-glebia"
                    }`}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-tekst-3">Albo stuknij w mapę, żeby wybrać punkt.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Pole „Dokąd jedziesz?”: miejsce z Google Places po nazwie, wynik od razu staje się celem. */
function DestinationSearch({ onPick }: { onPick: (end: RideEnd) => void }) {
  const [text, setText] = useState("");
  const { results, isSearching, isError, hasQuery } = useDestinationSearch(text);

  return (
    <div className="pt-2.5">
      <div className="relative">
        <PinIcon className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-tekst-3" />
        <input
          type="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Dokąd jedziesz?"
          aria-label="Dokąd jedziesz"
          enterKeyHint="search"
          autoComplete="off"
          className="h-11 w-full rounded-[14px] bg-tekst/[0.06] pl-9 pr-3 text-[16px] text-tekst outline-none transition-shadow placeholder:text-tekst-3 focus:bg-white focus:ring-2 focus:ring-glebia"
        />
      </div>
      {hasQuery && (
        <ul aria-label="Wyniki" className="mt-1.5 overflow-hidden rounded-[14px] bg-white">
          {results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                onClick={() => {
                  haptic(4);
                  onPick({ type: "destination", name: result.name, point: result.position });
                  setText("");
                }}
                className="flex w-full flex-col px-3 py-2 text-left transition-colors hover:bg-mieta-jasna active:bg-mieta-jasna"
              >
                <span className="truncate text-[14px] font-bold text-tekst">{result.name}</span>
                <span className="truncate text-xs text-tekst-3">{result.address}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-3 py-2 text-[13px] text-tekst-3">
              {isSearching
                ? "Szukam…"
                : isError
                  ? "Nie udało się wyszukać. Wybierz cel niżej albo na mapie."
                  : "Nie znalazłam takiego miejsca w Warszawie."}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

type SawaAboveProps = {
  progress: MotionValue<number>;
  onPoke: () => void;
  sawa: ReturnType<typeof useAnimationControls>;
};

/** Sawa i dymek nad kartą. Przy zwijaniu karty znikają szybciej niż karta jedzie w dół. */
function SawaAbove({ progress, onPoke, sawa }: SawaAboveProps) {
  const opacity = useTransform(progress, [0, 0.5], [1, 0]);
  const scale = useTransform(progress, [0, 0.5], [1, 0.9]);

  return (
    <motion.div
      style={{ opacity, scale }}
      className="pointer-events-none relative h-[120px] origin-bottom md:h-[132px]"
    >
      <motion.button
        type="button"
        aria-label="Sawa"
        onClick={onPoke}
        initial={{ y: 70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...SPRING, delay: 0.12 }}
        className="pointer-events-auto absolute -bottom-[34px] left-1 w-[124px] origin-bottom md:w-[136px]"
      >
        <motion.div animate={sawa} className="origin-bottom">
          <Image
            src="/sawa-32.png"
            alt=""
            width={568}
            height={862}
            priority
            draggable={false}
            className="h-auto w-full drop-shadow-[0_10px_14px_rgba(16,43,42,0.22)]"
          />
        </motion.div>
      </motion.button>

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...SPRING, delay: 0.24 }}
        style={{ transformOrigin: "0% 100%" }}
        className="szklo absolute bottom-6 left-[130px] right-1 rounded-[20px_20px_20px_6px] px-4 py-3 md:left-[142px]"
      >
        <p className="text-[19px] font-extrabold leading-tight tracking-[-0.02em]">
          Ile masz dziś czasu?
        </p>
        <p className="mt-0.5 text-[13px] leading-snug text-tekst-2">
          Ułożę przejazd i opowiem, co mijasz za oknem.
        </p>
      </motion.div>
    </motion.div>
  );
}
