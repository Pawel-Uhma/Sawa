"use client";

import type { Travel } from "@sawa/shared";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "motion/react";
import { type CSSProperties, type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { RollingText, Spinner, useDelayed, useWaitMessage } from "@/components/waiting";
import { useT } from "@/features/i18n";
import { useDestinationSearch } from "../lib/destination-search";
import { haptic, SPRING } from "../lib/device";
import { formatDuration, sliderPercent } from "../lib/format";
import { DURATION_STOPS_MIN } from "../lib/mock-data";
import type { RideEnd, RideEndType } from "../lib/ride-end";
import { FloatingCard, Grabber } from "./floating-card";
import {
  ArrowRightIcon,
  CloseIcon,
  ForwardIcon,
  LoopIcon,
  PinIcon,
  TramIcon,
  WalkIcon,
} from "./icons";
import { SawaHead } from "./logo";
import { PrimaryButton } from "./primary-button";

type HomePanelProps = {
  durationMin: number;
  onDurationChange: (durationMin: number) => void;
  /** Najszybsza droga do celu (min), gdy wybrany jest cel. */
  fastestMin: number | null;
  /** Najkrótszy dozwolony krok suwaka: krok najszybszej drogi do celu. */
  minDurationMin: number | null;
  /** Planer liczy jeszcze najszybszą drogę do wybranego celu. */
  isFindingFastest: boolean;
  travel: Travel;
  onTravelChange: (travel: Travel) => void;
  rideEnd: RideEnd;
  /** Wybór w przełączniku; „Do celu” może jeszcze nie mieć celu. */
  endType: RideEndType;
  onRideEndTypeChange: (type: RideEndType) => void;
  /** `null` czyści wybrany cel. */
  onRideEndChange: (end: RideEnd | null) => void;
  onGenerate: () => void;
  /** Fałsz, dopóki przy „Do celu” nie ma wybranego celu. */
  canGenerate: boolean;
  planning: boolean;
  planError: string | null;
  /** Telefon jeszcze szuka lokalizacji; do tego czasu start jest pod 42 Warsaw. */
  locating: boolean;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

/** Podpisy pod suwakiem w miejscach ich wartości (suwak jest liniowy, więc 1 h nie leży w 1/4). */
const SCALE = [5, 60, 120, 180, 240];

/** Środek gałki suwaka (30 px) dla danej wartości: tor zaczyna się i kończy pół gałki od krawędzi. */
function thumbCenter(durationMin: number): string {
  return `calc(15px + (100% - 30px) * ${sliderPercent(durationMin) / 100})`;
}

const TRAVEL_OPTIONS: ChoiceOption<Travel>[] = [
  { type: "walk", label: "Pieszo", en: { label: "On foot" }, icon: <WalkIcon /> },
  { type: "transit", label: "Komunikacją", en: { label: "Transit" }, icon: <TramIcon /> },
];

const END_OPTIONS: ChoiceOption<RideEndType>[] = [
  { type: "loop", label: "Wracam tu", en: { label: "Back here" }, icon: <LoopIcon /> },
  { type: "destination", label: "Do celu", en: { label: "To a place" }, icon: <ForwardIcon /> },
];

/**
 * Ekran główny: Sawa pyta o czas (suwak), pod spodem dwa podpisane przełączniki, jak jedziesz
 * i gdzie kończysz. Przycisk powtarza wybór, żeby było jasne, co się wyznaczy.
 */
export function HomePanel({
  durationMin,
  onDurationChange,
  fastestMin,
  minDurationMin,
  isFindingFastest,
  travel,
  onTravelChange,
  rideEnd,
  endType,
  onRideEndTypeChange,
  onRideEndChange,
  onGenerate,
  canGenerate,
  planning,
  planError,
  locating,
  collapsed,
  onCollapsedChange,
}: HomePanelProps) {
  const sawa = useAnimationControls();
  const t = useT();
  const lastStep = useRef(durationMin);
  const minIndex = minDurationMin === null ? 0 : DURATION_STOPS_MIN.indexOf(minDurationMin);
  const isFastest = fastestMin !== null && durationMin === minDurationMin;
  // Na najkrótszym kroku nagłówek pokazuje prawdziwy czas najszybszej drogi, nie zaokrąglony krok
  const shownMin =
    isFastest && fastestMin !== null ? Math.max(1, Math.round(fastestMin)) : durationMin;
  // Planer potrafi liczyć kilkanaście sekund: przycisk mówi, co teraz robi, a potem, że to trwa
  const planningText = useWaitMessage(planning, [
    {
      afterSec: 0,
      text:
        travel === "walk"
          ? t("Sprawdzam ulice w okolicy…", "Checking the streets nearby…")
          : t("Sprawdzam rozkład ZTM…", "Checking the ZTM timetable…"),
    },
    { afterSec: 3, text: t("Wybieram miejsca z historią…", "Picking places with stories…") },
    { afterSec: 7, text: t("Układam kolejność przystanków…", "Putting the stops in order…") },
    {
      afterSec: 14,
      text: t("Jeszcze chwila, to dłuższa trasa…", "Almost there, it's a long one…"),
    },
  ]);
  const showLocating = useDelayed(locating, 600);

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
      label={t("Plan przejazdu", "Ride plan")}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      peekPx={64}
      className="rounded-[28px] px-4 pb-4 pt-5 md:rounded-[32px] md:px-6 md:pb-6 md:pt-6"
    >
      <Grabber />
      <div className="flex items-center gap-2.5">
        <motion.button
          type="button"
          aria-label="Sawa"
          onClick={poke}
          animate={sawa}
          className="size-10 shrink-0 origin-bottom md:size-11"
        >
          <SawaHead className="size-full" />
        </motion.button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[18px] font-extrabold leading-tight tracking-[-0.02em] md:text-[20px]">
            {t("Ile masz czasu?", "How much time do you have?")}
          </h2>
          <p className="flex min-w-0 items-center gap-1.5 text-[12.5px] leading-snug text-tekst-2">
            {showLocating && <Spinner className="size-3 text-glebia" />}
            <RollingText
              text={
                showLocating
                  ? t("Szukam, gdzie jesteś…", "Finding where you are…")
                  : t("Opowiem, co mijasz", "I'll tell you what you pass")
              }
            />
          </p>
        </div>
      </div>

      {/* Wartość we własnym wierszu nad suwakiem: w nagłówku ucinała tytuł */}
      <span className="relative mt-3 block h-11 overflow-hidden md:h-[52px]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.strong
            key={shownMin}
            initial={{ y: 22, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -22, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="block text-[40px] font-extrabold leading-[44px] tracking-[-0.04em] text-glebia tabular-nums md:text-[46px] md:leading-[52px]"
          >
            {formatDuration(shownMin)}
          </motion.strong>
        </AnimatePresence>
      </span>

      {isFindingFastest ? (
        <p aria-live="polite" className="mt-2 flex items-center gap-1.5 text-[13px] text-tekst-2">
          <Spinner className="size-3.5 text-glebia" />
          {t("Szukam najszybszej drogi do celu…", "Finding the fastest way there…")}
        </p>
      ) : (
        fastestMin !== null && (
          <p className="mt-2 text-[13px] text-tekst-2">
            {isFastest
              ? t(
                  "Najszybsza droga do celu. Przesuń, żeby pojechać dłużej i krajoznawczo.",
                  "The fastest way there. Slide to take a longer, scenic ride.",
                )
              : t(
                  `Krajoznawczo. Najszybciej dojedziesz w ${formatDuration(Math.round(fastestMin))}.`,
                  `Scenic. The fastest way takes ${formatDuration(Math.round(fastestMin))}.`,
                )}
          </p>
        )
      )}

      <div className="relative">
        <input
          type="range"
          className="suwak mt-2.5"
          aria-label={t("Czas przejażdżki", "Ride length")}
          aria-valuetext={formatDuration(durationMin)}
          min={0}
          max={DURATION_STOPS_MIN.length - 1}
          step={1}
          value={DURATION_STOPS_MIN.indexOf(durationMin)}
          onChange={(event) => {
            // Krócej niż najszybsza droga do celu się nie da: gałka zatrzymuje się na jej kroku
            const value = DURATION_STOPS_MIN[Math.max(Number(event.target.value), minIndex)];
            if (value !== lastStep.current) haptic(4);
            lastStep.current = value;
            onDurationChange(value);
          }}
          style={{ "--postep": thumbCenter(durationMin) } as CSSProperties}
        />
        {minIndex > 0 && minDurationMin !== null && (
          // Wyszarzony odcinek toru poniżej najszybszej drogi
          <span
            aria-hidden
            className="pointer-events-none absolute top-[21px] left-0 h-1.5 rounded-l-full bg-powierzchnia/60"
            style={{ width: thumbCenter(minDurationMin) }}
          />
        )}
      </div>
      <div aria-hidden className="relative h-3.5 text-[11px] font-semibold text-tekst-3">
        {SCALE.map((value, index) => (
          <span
            key={value}
            // Skrajne podpisy przy krawędziach, żeby nie wystawały poza kartę.
            style={
              index === 0
                ? { left: 0 }
                : index === SCALE.length - 1
                  ? { right: 0 }
                  : { left: thumbCenter(value) }
            }
            className={`absolute top-0 whitespace-nowrap tabular-nums transition-colors duration-200 ${
              index === 0 || index === SCALE.length - 1 ? "" : "-translate-x-1/2"
            } ${value === durationMin ? "text-glebia" : ""} ${
              minDurationMin !== null && value < minDurationMin ? "opacity-40" : ""
            }`}
          >
            {formatDuration(value)}
          </span>
        ))}
      </div>

      <ChoiceGroup
        label={t("Jak jedziesz", "How you travel")}
        options={TRAVEL_OPTIONS}
        value={travel}
        layoutId="kafelek-sposob"
        onChange={onTravelChange}
        className="mt-3"
      />

      <RideEndPicker
        rideEnd={rideEnd}
        endType={endType}
        onTypeChange={onRideEndTypeChange}
        onChange={onRideEndChange}
      />

      <PrimaryButton
        onClick={onGenerate}
        disabled={planning || !canGenerate}
        aria-busy={planning}
        className={`mt-4 !h-12 md:!h-14 ${planning ? "disabled:!opacity-100" : ""}`}
      >
        {/* Przycisk mówi, co wyjdzie: pętla albo droga do celu (czas jest w nagłówku).
            W czasie liczenia zostaje pełny, ze spinnerem i tym, co planer teraz robi. */}
        {planningText ? (
          <>
            <Spinner className="size-[18px]" />
            <RollingText text={planningText} className="text-[15px]" />
          </>
        ) : (
          <>
            {!canGenerate
              ? t("Najpierw wybierz cel", "Pick a destination first")
              : rideEnd.type === "loop"
                ? t("Wyznacz pętlę", "Plan a loop")
                : t("Wyznacz trasę do celu", "Plan the way there")}
            {canGenerate && <ArrowRightIcon className="size-5" />}
          </>
        )}
      </PrimaryButton>
      <span aria-live="polite" className="sr-only">
        {planning ? t("Układam trasę", "Planning your route") : ""}
      </span>
      {planError && (
        <p role="alert" className="mt-2 text-center text-sm text-tekst-2">
          {planError}
        </p>
      )}
    </FloatingCard>
  );
}

type ChoiceOption<T extends string> = {
  type: T;
  label: string;
  en: { label: string };
  icon: ReactNode;
};

type ChoiceGroupProps<T extends string> = {
  label: string;
  options: ChoiceOption<T>[];
  value: T;
  layoutId: string;
  onChange: (type: T) => void;
  className?: string;
};

/**
 * Podpisane pytanie i przełącznik segmentowy (jak w iOS): dwie opcje w jednym torze, zaznaczona
 * jest białą płytką, która przesuwa się sprężyną. Podpis mówi, że to osobne pytanie.
 */
function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  layoutId,
  onChange,
  className = "",
}: ChoiceGroupProps<T>) {
  const t = useT();
  return (
    <div className={className}>
      <p aria-hidden className="etykieta mb-1.5 px-0.5">
        {label}
      </p>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex rounded-[14px] bg-tekst/[0.06] p-[3px]"
      >
        {options.map((option) => {
          const isActive = option.type === value;
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
              className={`relative flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-[11px] text-[15px] font-bold tracking-[-0.01em] transition-colors duration-200 active:scale-[0.97] md:h-11 ${
                isActive ? "text-tekst" : "text-tekst-2"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId={layoutId}
                  transition={SPRING}
                  className="absolute inset-0 rounded-[inherit] bg-powierzchnia shadow-[0_1px_3px_rgba(16,43,42,0.14),0_0_0_0.5px_rgba(16,43,42,0.06)]"
                />
              )}
              <span
                className={`relative transition-colors duration-200 [&>svg]:size-[18px] ${
                  isActive ? "text-glebia" : ""
                }`}
              >
                {option.icon}
              </span>
              <span className="relative truncate">{t(option.label, option.en.label)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type RideEndPickerProps = {
  rideEnd: RideEnd;
  endType: RideEndType;
  onTypeChange: (type: RideEndType) => void;
  onChange: (end: RideEnd | null) => void;
};

/**
 * Koniec trasy: przełącznik, a przy „Do celu” jedno pole. Bez celu to wyszukiwarka, z celem
 * staje się kartką wybranego celu z krzyżykiem, który wraca do szukania. Celu nie podsuwamy.
 */
function RideEndPicker({ rideEnd, endType, onTypeChange, onChange }: RideEndPickerProps) {
  const destination = rideEnd.type === "destination" ? rideEnd : null;
  const t = useT();

  return (
    <div className="mt-3">
      <ChoiceGroup
        label={t("Gdzie kończysz", "Where you finish")}
        options={END_OPTIONS}
        value={endType}
        layoutId="kafelek-koniec"
        onChange={onTypeChange}
      />

      <AnimatePresence initial={false}>
        {endType === "destination" && (
          <motion.div
            key="cele"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.35 }}
            className="overflow-hidden"
          >
            {/* Pierścień fokusu wystaje poza pole, więc padding zamiast przycinania go */}
            <div className="px-0.5 pb-0.5 pt-2.5">
              {destination ? (
                <ChosenDestination
                  name={destination.name}
                  address={destination.address}
                  onClear={() => onChange(null)}
                />
              ) : (
                <DestinationSearch onPick={onChange} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Wybrany cel w miejscu pola: nazwa, adres i krzyżyk, który wraca do szukania. */
function ChosenDestination({
  name,
  address,
  onClear,
}: {
  name: string;
  address?: string;
  onClear: () => void;
}) {
  const t = useT();
  return (
    <div className="flex min-h-11 items-center gap-2.5 rounded-[14px] bg-mieta-jasna py-2 pl-3 pr-1.5">
      <PinIcon className="size-[18px] shrink-0 text-glebia" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-bold leading-5 text-tekst">{name}</span>
        {address && <span className="truncate text-xs leading-4 text-tekst-2">{address}</span>}
      </div>
      <button
        type="button"
        onClick={() => {
          haptic(4);
          onClear();
        }}
        aria-label={t("Zmień cel", "Change destination")}
        className="grid size-8 shrink-0 place-items-center rounded-full text-tekst-2 transition-[background-color,transform] hover:bg-tekst/[0.06] active:scale-90"
      >
        <CloseIcon className="size-4" />
      </button>
    </div>
  );
}

/** Pole „Dokąd jedziesz?”: miejsce z Google Places po nazwie, wynik od razu staje się celem. */
function DestinationSearch({ onPick }: { onPick: (end: RideEnd) => void }) {
  const [text, setText] = useState("");
  const t = useT();
  const { results, isSearching, isError, hasQuery } = useDestinationSearch(text);

  return (
    <div>
      <div className="relative">
        <PinIcon className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-tekst-3" />
        <input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("Dokąd jedziesz?", "Where are you going?")}
          aria-label={t("Dokąd jedziesz", "Where are you going")}
          enterKeyHint="search"
          autoComplete="off"
          className="h-11 w-full rounded-[14px] bg-tekst/[0.06] pl-9 pr-10 text-[16px] text-tekst outline-none transition-shadow placeholder:text-tekst-3 focus:bg-powierzchnia focus:ring-2 focus:ring-glebia"
        />
        {isSearching && hasQuery ? (
          <Spinner className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-tekst-3" />
        ) : (
          text && (
            <button
              type="button"
              onClick={() => setText("")}
              aria-label={t("Wyczyść", "Clear")}
              className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-tekst-3 active:scale-90"
            >
              <CloseIcon className="size-4" />
            </button>
          )
        )}
      </div>
      <AnimatePresence initial={false}>
        {hasQuery ? (
          <AutoHeight key="wyniki">
            <ul
              aria-label={t("Wyniki", "Results")}
              className="mt-1.5 divide-y divide-tekst/[0.06] overflow-hidden rounded-[14px] bg-powierzchnia"
            >
              {results.slice(0, 5).map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    onClick={() => {
                      haptic(4);
                      onPick({
                        type: "destination",
                        name: result.name,
                        address: result.address,
                        point: result.position,
                      });
                      setText("");
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-mieta-jasna active:bg-mieta-jasna"
                  >
                    {result.kind === "address" && (
                      <PinIcon className="size-[18px] shrink-0 text-glebia" />
                    )}
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[14px] font-bold text-tekst">
                        {result.name}
                      </span>
                      <span className="truncate text-xs text-tekst-3">{result.address}</span>
                    </span>
                  </button>
                </li>
              ))}
              {results.length === 0 && (
                <li
                  aria-live="polite"
                  className="flex items-center gap-2 px-3 py-2.5 text-[13px] text-tekst-3"
                >
                  {isSearching && <Spinner className="size-3.5" />}
                  {isSearching
                    ? t("Szukam w Warszawie…", "Searching Warsaw…")
                    : isError
                      ? t(
                          "Nie udało się wyszukać. Wybierz cel na mapie.",
                          "Search failed. Pick a destination on the map.",
                        )
                      : t(
                          "Nie znalazłam takiego miejsca w Warszawie.",
                          "I couldn't find that place in Warsaw.",
                        )}
                </li>
              )}
            </ul>
          </AutoHeight>
        ) : (
          <AutoHeight key="podpowiedz">
            <p className="pt-2 text-xs text-tekst-3">
              {t("Albo stuknij w mapę, żeby wybrać punkt.", "Or tap the map to pick a point.")}
            </p>
          </AutoHeight>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Wysokość dociągana sprężyną do treści. Karta rośnie od dołu, więc bez tego każda zmiana
 * liczby wyników szarpie całą kartę w jednej klatce.
 */
function AutoHeight({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const observer = new ResizeObserver(() => setHeight(inner.offsetHeight));
    observer.observe(inner);
    setHeight(inner.offsetHeight);
    return () => observer.disconnect();
  }, []);

  const transition = reduce
    ? { duration: 0 }
    : { type: "spring" as const, bounce: 0, duration: 0.35 };
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height, opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={transition}
      className="overflow-hidden"
    >
      <div ref={innerRef}>{children}</div>
    </motion.div>
  );
}
