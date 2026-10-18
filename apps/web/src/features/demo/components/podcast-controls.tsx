"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { RollingText, Spinner } from "@/components/waiting";
import { LANG_LOCALES, useLang, useT } from "@/features/i18n";
import { haptic, SPRING } from "../lib/device";
import { placesLabel } from "../lib/format";
import type { MockStop } from "../lib/mock-data";
import { inMinutes, splitName } from "../lib/podcast";
import { storyStartSec } from "../lib/ride-clock";
import { useStoryWaitMessage } from "../lib/story-wait";
import {
  CloseIcon,
  PauseIcon,
  PlayIcon,
  RestartIcon,
  SkipNextIcon,
  SkipPrevIcon,
  SparkIcon,
} from "./icons";

// Szerokość jednego miejsca na linii; bieżące stoi na środku, jak na wyświetlaczu w tramwaju.
// Tyle, żeby dłuższe słowo („starozakonnych”) zmieściło się z przeniesieniem, bez wchodzenia na sąsiada
const STOP_W = 96;
// Co ile przeliczamy godziny dojazdu przy miejscach
const WALL_TICK_MS = 30_000;

export type PodcastProps = {
  stops: MockStop[];
  activeIndex: number;
  /** Czas jazdy (zegar jazdy) i długość całej przejażdżki, w sekundach. */
  rideSec: number;
  totalSec: number;
  isPlaying: boolean;
  /** Sawa czeka na pierwsze miejsce. */
  waiting: boolean;
  /** Użytkownik zatrzymał Sawę (stop albo pauza): zegar jazdy stoi do wznowienia. */
  held?: boolean;
  /** Opowieść o bieżącym miejscu jeszcze się ładuje (tekst albo głos). */
  loading: boolean;
};

export type Podcast = ReturnType<typeof usePodcast>;

type SawaMode = "waiting" | "thinking" | "telling" | "paused";

/**
 * Kropka „na żywo”: koralowy pierścień, w środku rdzeń, który płynnie oddycha (animacja CSS
 * w obie strony, więc nie skacze przy pętli ani przy rerenderze). Przy pauzie stoi i szarzeje.
 */
export function LiveDot({ on }: { on: boolean }) {
  return (
    <span
      className={`relative flex size-2.5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${on ? "border-koral" : "border-tekst-3"}`}
    >
      <span
        className={`size-1 rounded-full transition-colors ${on ? "kropka-oddech bg-koral" : "bg-tekst-3"}`}
      />
    </span>
  );
}

/** Wspólny stan nagłówka i doku. */
export function usePodcast({
  stops,
  activeIndex,
  rideSec,
  totalSec,
  isPlaying,
  waiting,
  held = false,
  loading,
}: PodcastProps) {
  const lang = useLang();
  const t = useT();
  const total = Math.max(totalSec, 1);
  const sec = Math.min(total, rideSec);
  const index = activeIndex;
  const stop = stops[index];

  // Odtwarzanie włączone, a opowieści jeszcze nie ma: jak „buforowanie” w Podcastach
  const buffering = isPlaying && loading && !waiting;

  // Co Sawa robi teraz: czeka na miejsce, myśli nad opowieścią, mówi albo stoi
  const mode: SawaMode =
    waiting && !held ? "waiting" : buffering ? "thinking" : isPlaying ? "telling" : "paused";
  const waitIn = waiting && stop ? inMinutes(storyStartSec(stop) - sec, lang) : null;

  // Pod linią ile miejsc zostało (kiedy Sawa zacznie, mówi wiersz stanu nad linią)
  const left = stops.length - 1 - index;
  const hint =
    left > 0
      ? t(`Jeszcze ${placesLabel(left, "pl")}`, `${placesLabel(left, "en")} to go`)
      : t("Ostatnie miejsce tej przejażdżki", "Last place on this ride");

  return {
    stops,
    index,
    stop,
    sec,
    total,
    isPlaying,
    waiting,
    held,
    buffering,
    mode,
    waitIn,
    hint,
    hasNext: activeIndex < stops.length - 1,
  };
}

/**
 * Góra ekranu, jak „teraz odtwarzane” z tekstem w Muzyce: status i numer miejsca, duża nazwa,
 * pod nią adres. Zapis opowieści idzie zaraz pod tym, sterowanie jest w doku na dole.
 */
export function PodcastHeader({ podcast, onLeave }: { podcast: Podcast; onLeave: () => void }) {
  const reduce = useReducedMotion();
  const t = useT();
  const { stop, stops, index, mode, waitIn } = podcast;
  const name = stop ? splitName(stop.name) : null;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2.5">
        <SawaStatus mode={mode} waitIn={waitIn} />
        <span className="etykieta shrink-0 tabular-nums">
          {index + 1} {t("z", "of")} {stops.length}
        </span>
        {/* Krzyżyk anuluje trasę i wraca do planu, jak zamknięcie arkusza w Mapach */}
        <button
          type="button"
          onClick={onLeave}
          aria-label={t("Anuluj trasę", "Cancel route")}
          className="-mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-tlo-2 text-tekst-2 transition-[transform,background-color] hover:bg-tekst/10 active:scale-[0.92]"
        >
          <CloseIcon className="size-[18px]" />
        </button>
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={stop?.id ?? "none"}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={SPRING}
          className="mt-1.5"
        >
          <h2 className="line-clamp-2 text-[24px] font-extrabold leading-[1.15] tracking-[-0.03em] text-tekst">
            {name?.title ?? t("Trasa", "Route")}
          </h2>
          {name?.sub && <p className="mt-1 truncate text-sm text-tekst-2">{name.sub}</p>}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export type PodcastDockProps = {
  podcast: Podcast;
  /** Postęp bieżącej opowieści, 0–100: pierścień wokół przycisku odtwarzania. */
  progress: number;
  onToggle: () => void;
  onStop: () => void;
  onBack: () => void;
  onNext: () => void;
  onMore: () => void;
  /** Stuknięcie w miejsce na linii: jego opowieść od początku. */
  onJump: (index: number) => void;
};

/**
 * Dok przy dolnej krawędzi, pod kciukiem: linia miejsc jak w tramwaju (gdzie jestem, co dalej
 * i o której), pod nią ile zostało i jeden rząd przycisków. Postęp opowieści jest w pierścieniu
 * wokół odtwarzania, bo oś czasu całej jazdy nic pasażerowi nie mówi.
 */
export function PodcastDock({
  podcast,
  progress,
  onToggle,
  onStop,
  onBack,
  onNext,
  onMore,
  onJump,
}: PodcastDockProps) {
  const t = useT();
  const lang = useLang();
  const { stops, index, sec, total, hint, buffering, isPlaying, waiting, mode } = podcast;
  const now = useWallClock();
  const at = (rideSec: number) =>
    now === null
      ? null
      : new Intl.DateTimeFormat(LANG_LOCALES[lang], { hour: "2-digit", minute: "2-digit" }).format(
          now + (rideSec - sec) * 1000,
        );
  const arrival = at(total);

  return (
    <div className="flex flex-col">
      <StopLine stops={stops} index={index} mode={mode} at={at} onJump={onJump} />
      <p className="mt-2 flex justify-between gap-3 text-[12px] font-semibold text-tekst-3">
        <span className="min-w-0 truncate">{hint}</span>
        {arrival && (
          <span className="shrink-0 tabular-nums">
            {t("Na miejscu ok. ", "Arriving about ")}
            <span className="text-tekst-2">{arrival}</span>
          </span>
        )}
      </p>

      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            haptic(4);
            onMore();
          }}
          aria-label={t("Więcej o tym miejscu", "More about this place")}
          title={t("Więcej o tym miejscu", "More about this place")}
          className="flex size-11 items-center justify-center rounded-full bg-mieta-jasna text-glebia-ciemna transition-transform active:scale-[0.92]"
        >
          <SparkIcon className="size-5" />
        </button>
        <div className="flex items-center gap-4">
          <RoundButton label={t("Wstecz", "Back")} onClick={onBack}>
            <SkipPrevIcon className="size-7" />
          </RoundButton>
          <motion.button
            type="button"
            onClick={() => {
              haptic();
              onToggle();
            }}
            aria-label={
              isPlaying
                ? t("Wstrzymaj Sawę", "Pause Sawa")
                : podcast.waiting && !podcast.held
                  ? t("Opowiedz teraz", "Tell me now")
                  : t("Wznów Sawę", "Resume Sawa")
            }
            aria-busy={buffering}
            whileTap={{ scale: 0.92 }}
            transition={SPRING}
            className="relative flex size-[68px] items-center justify-center rounded-full bg-glebia text-white shadow-[0_8px_20px_rgba(23,112,111,0.3)] transition-colors hover:bg-glebia-ciemna"
          >
            <ProgressRing progress={progress} show={!buffering && !waiting} />
            <BufferRing show={buffering} />
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={isPlaying ? "pause" : "play"}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.25 }}
              >
                {isPlaying ? (
                  <PauseIcon className="size-8" />
                ) : (
                  <PlayIcon className="size-8 translate-x-[2px]" />
                )}
              </motion.span>
            </AnimatePresence>
          </motion.button>
          <RoundButton
            label={t("Następne miejsce", "Next place")}
            onClick={onNext}
            disabled={!podcast.hasNext}
          >
            <SkipNextIcon className="size-7" />
          </RoundButton>
        </div>
        <button
          type="button"
          onClick={() => {
            haptic(4);
            onStop();
          }}
          aria-label={t(
            "Zatrzymaj i wróć na początek opowieści",
            "Stop and go back to the start of the story",
          )}
          title={t("Od początku", "From the start")}
          className="flex size-11 items-center justify-center rounded-full text-tekst-2 transition-[transform,background-color] hover:bg-tlo-2 active:scale-[0.92]"
        >
          <RestartIcon className="size-5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Linia miejsc jak wyświetlacz w tramwaju: minione wyszarzone, bieżące w koralu na środku,
 * następne z godziną dojazdu. Przewija się palcem w bok; po zmianie miejsca wraca na środek.
 */
function StopLine({
  stops,
  index,
  mode,
  at,
  onJump,
}: {
  stops: MockStop[];
  index: number;
  mode: SawaMode;
  at: (rideSec: number) => string | null;
  onJump: (index: number) => void;
}) {
  const t = useT();
  const reduce = useReducedMotion();
  const listRef = useRef<HTMLOListElement>(null);
  const placed = useRef(false);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    // Pierwszy raz bez animacji, potem płynnie do nowego miejsca
    list.scrollTo({
      left: index * STOP_W,
      behavior: reduce || !placed.current ? "auto" : "smooth",
    });
    placed.current = true;
  }, [index, reduce]);

  return (
    <ol
      ref={listRef}
      aria-label={t("Miejsca na trasie", "Places on the route")}
      className="-mx-4 mt-1 flex snap-x overflow-x-auto overscroll-x-contain px-[calc(50%-48px)] [mask-image:linear-gradient(to_right,transparent,#000_24px,#000_calc(100%-24px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {stops.map((s, i) => {
        const past = i < index;
        const current = i === index;
        const when = current
          ? mode === "waiting"
            ? at(storyStartSec(s))
            : mode === "thinking"
              ? t("Sawa myśli", "thinking")
              : t("teraz", "now")
          : at(storyStartSec(s));
        return (
          <li key={s.id} className="relative w-[96px] shrink-0 snap-center">
            {i > 0 && (
              <span
                aria-hidden="true"
                className={`absolute top-[10px] left-0 h-1 w-1/2 ${i <= index ? "bg-glebia/40" : "bg-tekst/10"}`}
              />
            )}
            {i < stops.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute top-[10px] right-0 h-1 w-1/2 ${past ? "bg-glebia/40" : "bg-tekst/10"}`}
              />
            )}
            <button
              type="button"
              aria-current={current ? "step" : undefined}
              aria-label={`${i + 1}. ${s.name}${when ? `, ${when}` : ""}`}
              onClick={() => {
                if (current) return;
                haptic(4);
                onJump(i);
              }}
              className="relative flex w-full flex-col items-center px-1 text-center transition-transform active:scale-[0.94]"
            >
              <span className="relative flex h-6 items-center">
                {current && <CurrentPulse mode={mode} />}
                <span
                  className={`relative rounded-full transition-[width,height,background-color] ${
                    current
                      ? mode === "waiting"
                        ? "size-[22px] border-[3px] border-koral bg-powierzchnia"
                        : "size-[22px] border-4 border-powierzchnia bg-koral shadow-[0_0_0_2px_var(--koral),0_4px_10px_rgba(242,117,95,0.35)]"
                      : past
                        ? "size-3.5 bg-glebia/45"
                        : "size-3.5 border-[3px] border-tekst/20 bg-powierzchnia"
                  }`}
                />
              </span>
              <span
                className={`mt-1.5 line-clamp-2 w-full hyphens-auto break-words px-1 text-[11.5px] leading-[1.25] [overflow-wrap:anywhere] ${
                  current
                    ? "font-bold text-koral"
                    : past
                      ? "font-semibold text-tekst-3"
                      : "font-bold text-tekst"
                }`}
              >
                {splitName(s.name).title}
              </span>
              {when && (
                <span className="mt-0.5 text-[11px] font-semibold tabular-nums text-tekst-3">
                  {when}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Wiersz stanu w nagłówku, co Sawa teraz robi, żeby cisza nie wyglądała na zawieszenie:
 * czeka, aż podjedziesz (z czasem), myśli nad opowieścią (kolejne kroki), opowiada albo stoi.
 */
function SawaStatus({ mode, waitIn }: { mode: SawaMode; waitIn: string | null }) {
  const t = useT();
  const reduce = useReducedMotion();
  const thinking = useStoryWaitMessage(mode === "thinking");
  const text =
    mode === "waiting"
      ? t("Sawa czeka, aż podjedziemy", "Sawa is waiting till we get there")
      : mode === "thinking"
        ? (thinking ?? t("Sawa zbiera myśli…", "Sawa is gathering her thoughts…"))
        : mode === "telling"
          ? t("Sawa opowiada", "Sawa is telling the story")
          : t("Wstrzymane", "Paused");

  return (
    <p className="etykieta flex min-w-0 flex-1 items-center gap-2" aria-live="polite">
      <span className="flex size-3 shrink-0 items-center justify-center">
        {mode === "thinking" ? (
          <Spinner className="size-3 text-koral" />
        ) : mode === "waiting" ? (
          <WaitDots reduce={Boolean(reduce)} />
        ) : (
          <LiveDot on={mode === "telling"} />
        )}
      </span>
      <span className="min-w-0 truncate">
        <RollingText text={waitIn && mode === "waiting" ? `${text} · ${waitIn}` : text} />
      </span>
    </p>
  );
}

/** Trzy kropki jedna po drugiej: Sawa czeka. Przy ograniczonym ruchu stoją. */
function WaitDots({ reduce }: { reduce: boolean }) {
  return (
    <span aria-hidden="true" className="flex items-center gap-[3px]">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-[3px] rounded-full bg-koral"
          animate={reduce ? undefined : { opacity: [0.25, 1, 0.25] }}
          transition={{
            duration: 1.2,
            repeat: Number.POSITIVE_INFINITY,
            delay: i * 0.2,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}

/**
 * Ruch wokół bieżącego miejsca: przy czekaniu fala jak sonar (zbliżamy się), przy myśleniu
 * obracający się łuk. Gdy Sawa mówi albo stoi, nic się nie rusza.
 */
function CurrentPulse({ mode }: { mode: SawaMode }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  if (mode === "waiting") {
    return (
      <motion.span
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 size-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-koral/40"
        animate={{ scale: [1, 2], opacity: [0.6, 0] }}
        transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: "easeOut" }}
      />
    );
  }
  if (mode === "thinking") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 32 32"
        className="absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-1/2 animate-spin [animation-duration:1.1s]"
      >
        <circle
          cx="16"
          cy="16"
          r="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="22 66"
          className="text-koral"
        />
      </svg>
    );
  }
  return null;
}

/** Teraz w ms, co pół minuty; null przed pierwszym efektem (Date.now() w renderze psuje prerender). */
function useWallClock(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), WALL_TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** Ile zostało z bieżącej opowieści: cienki łuk wokół przycisku odtwarzania. */
function ProgressRing({ progress, show }: { progress: number; show: boolean }) {
  if (!show) return null;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 80 80"
      className="pointer-events-none absolute -inset-[6px] size-[80px] -rotate-90"
    >
      <circle
        cx="40"
        cy="40"
        r="37"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="text-glebia/15"
      />
      <circle
        cx="40"
        cy="40"
        r="37"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="100"
        strokeDashoffset={100 - Math.min(100, Math.max(0, progress))}
        className="text-glebia transition-[stroke-dashoffset] duration-500 ease-linear"
      />
    </svg>
  );
}

/** Obracający się łuk wokół przycisku odtwarzania, póki opowieść się ładuje. */
function BufferRing({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.svg
          key="pierscien"
          aria-hidden="true"
          viewBox="0 0 80 80"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", bounce: 0, duration: 0.3 }}
          className="pointer-events-none absolute -inset-[6px] size-[80px]"
        >
          <circle
            cx="40"
            cy="40"
            r="37"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-glebia/15"
          />
          <circle
            cx="40"
            cy="40"
            r="37"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="58 175"
            className="origin-center animate-spin text-glebia [animation-duration:1.1s]"
          />
        </motion.svg>
      )}
    </AnimatePresence>
  );
}

function RoundButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        haptic(4);
        onClick();
      }}
      className="flex size-14 items-center justify-center rounded-full text-tekst transition-[transform,background-color] hover:bg-tlo-2 active:scale-[0.88] active:bg-tlo-2 disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
