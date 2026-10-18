"use client";

import type { Destination, Travel } from "@sawa/shared";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "motion/react";
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal, flushSync } from "react-dom";
import { RollingText, Spinner, useDelayed, useWaitMessage } from "@/components/waiting";
import { useT } from "@/features/i18n";
import { useDestinationSearch } from "../lib/destination-search";
import { haptic, SPRING, useIsDesktop } from "../lib/device";
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
  onCoverChange?: (px: number) => void;
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
  onCoverChange,
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
      onCoverChange={onCoverChange}
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

/** Wynik z Google Places jako koniec trasy. */
function toRideEnd(result: Destination): RideEnd {
  return {
    type: "destination",
    name: result.name,
    address: result.address,
    point: result.position,
  };
}

/**
 * Pole „Dokąd jedziesz?”: miejsce z Google Places po nazwie, wynik od razu staje się celem.
 * Na telefonie stuknięcie otwiera wyszukiwanie na cały ekran (jak w Mapach Apple), bo karta
 * stoi na dole i z klawiaturą nie zostaje miejsca na wyniki.
 */
function DestinationSearch({ onPick }: { onPick: (end: RideEnd) => void }) {
  const isDesktop = useIsDesktop();
  return isDesktop ? (
    <InlineDestinationSearch onPick={onPick} />
  ) : (
    <SheetDestinationSearch onPick={onPick} />
  );
}

function MapHint() {
  const t = useT();
  return (
    <p className="pt-2 text-xs text-tekst-3">
      {t("Albo stuknij w mapę, żeby wybrać punkt.", "Or tap the map to pick a point.")}
    </p>
  );
}

/** Desktop: pole w karcie, wyniki w nakładce obok. Enter bierze pierwszy wynik. */
function InlineDestinationSearch({ onPick }: { onPick: (end: RideEnd) => void }) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const search = useDestinationSearch(text);
  const open = focused && search.hasQuery;

  function pick(result: Destination) {
    haptic(4);
    onPick(toRideEnd(result));
    setText("");
  }

  return (
    <div>
      <div ref={fieldRef} className="relative">
        <SearchField
          text={text}
          onTextChange={setText}
          isSearching={search.isSearching && search.hasQuery}
          expanded={open}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") event.currentTarget.blur();
            if (event.key === "Enter" && !search.isSearching && search.results[0]) {
              event.preventDefault();
              pick(search.results[0]);
            }
          }}
        />
      </div>
      <MapHint />

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <ResultsOverlay key="wyniki" anchorRef={fieldRef}>
                <DestinationResults {...search} onPick={pick} />
              </ResultsOverlay>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

/** Telefon: w karcie tylko „pole”, które otwiera wyszukiwanie na cały ekran. */
function SheetDestinationSearch({ onPick }: { onPick: (end: RideEnd) => void }) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useT();

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          haptic(4);
          // iOS pokaże klawiaturę tylko po fokusie w tym samym dotknięciu: arkusz musi już stać w DOM
          flushSync(() => setOpen(true));
          inputRef.current?.focus({ preventScroll: true });
        }}
        aria-haspopup="dialog"
        className="relative flex h-11 w-full items-center rounded-[14px] bg-tekst/[0.06] pl-9 pr-3 text-left text-[16px] text-tekst-3 transition-transform active:scale-[0.98]"
      >
        <PinIcon className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2" />
        {t("Dokąd jedziesz?", "Where are you going?")}
      </button>
      <MapHint />

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <SearchSheet
                key="szukaj"
                inputRef={inputRef}
                onPick={(end) => {
                  onPick(end);
                  setOpen(false);
                }}
                onClose={() => setOpen(false)}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

/** Widoczna część ekranu: na iOS klawiatura nie zmniejsza layoutu, tylko visualViewport. */
function useVisibleViewport() {
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => setBox({ top: viewport.offsetTop, height: viewport.height });
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);
  return box;
}

/**
 * Wyszukiwanie na cały ekran: pole u góry, „Anuluj” obok, wyniki do samej klawiatury.
 * Ptaszek nad klawiaturą i „Szukaj” biorą pierwszy wynik; gdy jeszcze szukamy, biorą go po odpowiedzi.
 */
function SearchSheet({
  inputRef,
  onPick,
  onClose,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  onPick: (end: RideEnd) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [pickWhenReady, setPickWhenReady] = useState(false);
  const closing = useRef(false);
  const search = useDestinationSearch(text);
  const viewport = useVisibleViewport();
  const reduce = useReducedMotion();
  const t = useT();

  function close() {
    closing.current = true;
    onClose();
  }

  function pick(result: Destination) {
    haptic(4);
    closing.current = true;
    onPick(toRideEnd(result));
  }

  // Ptaszek nad klawiaturą to blur pola; dotknięcia w arkuszu blura nie robią (preventDefault niżej)
  function confirm() {
    if (closing.current) return;
    if (!search.hasQuery) {
      if (!text.trim()) close();
      return;
    }
    if (search.isSearching) setPickWhenReady(true);
    else if (search.results[0]) pick(search.results[0]);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: pick czyta bieżące wyniki
  useEffect(() => {
    if (!pickWhenReady || search.isSearching) return;
    setPickWhenReady(false);
    if (search.results[0]) pick(search.results[0]);
  }, [pickWhenReady, search.isSearching, search.results]);

  const hidden = reduce ? { opacity: 0 } : { opacity: 0, y: 24 };
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={t("Dokąd jedziesz", "Where are you going")}
      initial={hidden}
      animate={{ opacity: 1, y: 0 }}
      exit={hidden}
      transition={reduce ? { duration: 0.15 } : SPRING}
      style={{ top: viewport?.top ?? 0, height: viewport?.height ?? "100dvh" }}
      onPointerDown={(event) => {
        if (event.target !== inputRef.current) event.preventDefault();
      }}
      className="fixed inset-x-0 z-50 flex flex-col bg-powierzchnia"
    >
      <div className="flex shrink-0 items-center gap-1 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <div className="relative min-w-0 flex-1">
          <SearchField
            inputRef={inputRef}
            text={text}
            onTextChange={(next) => {
              setPickWhenReady(false);
              setText(next);
            }}
            isSearching={search.isSearching && search.hasQuery}
            expanded={search.hasQuery}
            onBlur={confirm}
            onKeyDown={(event) => {
              if (event.key === "Escape") close();
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
          />
        </div>
        <button
          type="button"
          onClick={close}
          className="h-11 shrink-0 px-2 text-[16px] font-semibold text-glebia active:opacity-50"
        >
          {t("Anuluj", "Cancel")}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(env(safe-area-inset-bottom),8px)]">
        {search.hasQuery ? (
          <DestinationResults {...search} onPick={pick} />
        ) : (
          <p className="px-2.5 py-3 text-[13px] text-tekst-3">
            {t(
              "Wpisz nazwę miejsca albo adres w Warszawie.",
              "Type a place name or an address in Warsaw.",
            )}
          </p>
        )}
      </div>
    </motion.div>
  );
}

type SearchFieldProps = {
  inputRef?: RefObject<HTMLInputElement | null>;
  text: string;
  onTextChange: (text: string) => void;
  isSearching: boolean;
  expanded: boolean;
  onFocus?: () => void;
  onBlur: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
};

/** Pole wyszukiwania z pinezką; po prawej spinner albo krzyżyk. Rodzic daje `relative`. */
function SearchField({
  inputRef,
  text,
  onTextChange,
  isSearching,
  expanded,
  onFocus,
  onBlur,
  onKeyDown,
}: SearchFieldProps) {
  const t = useT();
  return (
    <>
      <PinIcon className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-tekst-3" />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={t("Dokąd jedziesz?", "Where are you going?")}
        aria-label={t("Dokąd jedziesz", "Where are you going")}
        aria-expanded={expanded}
        aria-controls="cele-wyniki"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        className="h-11 w-full rounded-[14px] bg-tekst/[0.06] pl-9 pr-10 text-[16px] text-tekst outline-none transition-shadow placeholder:text-tekst-3 focus:bg-powierzchnia focus:ring-2 focus:ring-glebia"
      />
      {/* Stała ramka po prawej: spinner i krzyżyk podmieniają się w miejscu, nic nie drga */}
      <div className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center">
        {isSearching ? (
          <Spinner className="pointer-events-none size-4 text-tekst-3" />
        ) : (
          text && (
            <button
              type="button"
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => onTextChange("")}
              aria-label={t("Wyczyść", "Clear")}
              className="grid size-8 place-items-center rounded-full text-tekst-3 active:scale-90"
            >
              <CloseIcon className="size-4" />
            </button>
          )
        )}
      </div>
    </>
  );
}

function DestinationResults({
  results,
  isSearching,
  isError,
  onPick,
}: {
  results: Destination[];
  isSearching: boolean;
  isError: boolean;
  onPick: (result: Destination) => void;
}) {
  const t = useT();
  return (
    <ul id="cele-wyniki" aria-label={t("Wyniki", "Results")}>
      {results.slice(0, 5).map((result) => (
        <li key={result.id}>
          <button
            type="button"
            // Fokus zostaje w polu: inaczej blur zamknąłby wyniki przed kliknięciem
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => onPick(result)}
            className="flex min-h-12 w-full items-center gap-2.5 rounded-[12px] px-2.5 py-2 text-left transition-colors hover:bg-mieta-jasna active:bg-mieta-jasna"
          >
            <PinIcon className="size-[18px] shrink-0 text-glebia" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[14px] font-bold text-tekst">{result.name}</span>
              <span className="truncate text-xs text-tekst-3">{result.address}</span>
            </span>
          </button>
        </li>
      ))}
      {results.length === 0 && (
        <li
          aria-live="polite"
          className="flex min-h-12 items-center gap-2.5 px-2.5 py-2 text-[13px] text-tekst-3"
        >
          <span className="grid size-[18px] shrink-0 place-items-center">
            {isSearching ? <Spinner className="size-3.5" /> : <PinIcon className="size-[18px]" />}
          </span>
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
  );
}

// Odstęp nakładki od krawędzi ekranu i od pola.
const EDGE_PX = 16;
const FIELD_GAP_PX = 8;

type Placement = { left: number; width: number; maxHeight: number } & (
  | { up: true; bottom: number }
  | { up: false; top: number }
);

/**
 * Gdzie postawić nakładkę: po tej stronie pola, gdzie jest więcej miejsca (karta stoi na dole,
 * więc zwykle nad polem), w granicach widocznej części ekranu, także z otwartą klawiaturą.
 */
function placeNear(rect: DOMRect): Placement {
  const viewport = window.visualViewport;
  const viewTop = viewport?.offsetTop ?? 0;
  const viewBottom = viewTop + (viewport?.height ?? window.innerHeight);
  const { clientWidth, clientHeight } = document.documentElement;
  const left = Math.max(EDGE_PX, rect.left);
  const width = Math.min(rect.right, clientWidth - EDGE_PX) - left;
  const above = Math.round(rect.top - viewTop - FIELD_GAP_PX - EDGE_PX);
  const below = Math.round(viewBottom - rect.bottom - FIELD_GAP_PX - EDGE_PX);
  return above >= below
    ? { up: true, bottom: clientHeight - rect.top + FIELD_GAP_PX, left, width, maxHeight: above }
    : { up: false, top: rect.bottom + FIELD_GAP_PX, left, width, maxHeight: below };
}

/**
 * Wyniki jako nakładka nad mapą, a nie lista w karcie: karta nie rośnie i nie podskakuje
 * przy każdym znaku. Idzie za polem co klatkę, bo kartę i klawiaturę przesuwają sprężyny.
 */
function ResultsOverlay({
  anchorRef,
  children,
}: {
  anchorRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const [place, setPlace] = useState<Placement | null>(null);

  useLayoutEffect(() => {
    let frame = 0;
    let last = "";
    const follow = () => {
      const anchor = anchorRef.current;
      if (anchor) {
        const next = placeNear(anchor.getBoundingClientRect());
        const key = JSON.stringify(next);
        if (key !== last) {
          last = key;
          setPlace(next);
        }
      }
      frame = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(frame);
  }, [anchorRef]);

  if (!place) return null;
  const hidden = reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: place.up ? 8 : -8 };

  return (
    <motion.div
      initial={hidden}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={hidden}
      transition={reduce ? { duration: 0.15 } : { type: "spring", bounce: 0, duration: 0.3 }}
      style={{
        left: place.left,
        width: place.width,
        ...(place.up ? { bottom: place.bottom } : { top: place.top }),
        transformOrigin: place.up ? "50% 100%" : "50% 0%",
      }}
      className="karta fixed z-50 overflow-hidden rounded-[18px] bg-powierzchnia!"
    >
      <AutoHeight>
        <div
          style={{ maxHeight: place.maxHeight }}
          className="overflow-y-auto overscroll-contain p-1.5"
        >
          {children}
        </div>
      </AutoHeight>
    </motion.div>
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
