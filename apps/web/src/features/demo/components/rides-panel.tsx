"use client";

import type { Route } from "@sawa/shared";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { planRoute, routeLine } from "../lib/api-data";
import { haptic, SPRING } from "../lib/device";
import { formatDuration } from "../lib/format";
import { type MockStop, type RidePreview, UPCOMING_RIDES } from "../lib/mock-data";
import type { Profile } from "../lib/onboarding";
import { ArrowRightIcon, PlayIcon, TramIcon } from "./icons";
import { KORAL, RouteThumb } from "./route-thumb";

type RidesPanelProps = {
  profile: Profile;
  durationMin: number;
  onDurationChange: (durationMin: number) => void;
  /** Trasa wyznaczona wcześniej w tej sesji (pusta, jeśli jeszcze żadnej nie było). */
  lastRoute: MockStop[];
  onOpenLastRoute: () => void;
  /** Start przejażdżki. Dostaje trasę z podglądu, żeby nie planować jej drugi raz; null, gdy podglądu nie ma. */
  onStart: (planned: Route | null) => void;
};

const SEGMENTS = [30, 60, 120, 240];

/** Zakładka Przejażdżki (makieta D): gotowe trasy jak odcinki podcastu, przełącznik czasu, ostatnia trasa. */
export function RidesPanel({
  profile,
  durationMin,
  onDurationChange,
  lastRoute,
  onOpenLastRoute,
  onStart,
}: RidesPanelProps) {
  // Podgląd to prawdziwa trasa z planera dla wybranego czasu, więc po starcie widać dokładnie to samo.
  const [preview, setPreview] = useState<Route | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    planRoute(durationMin, profile)
      .then((route) => !cancelled && setPreview(route))
      .catch(() => {
        if (cancelled) return;
        setPreview(null);
        setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [durationMin, profile]);
  const nearest = SEGMENTS.reduce((best, value) =>
    Math.abs(value - durationMin) < Math.abs(best - durationMin) ? value : best,
  );

  return (
    <motion.section
      aria-label="Przejażdżki"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={SPRING}
      className="absolute inset-0 z-[15] bg-tlo-2 md:inset-auto md:top-24 md:bottom-6 md:left-6 md:w-[360px] md:overflow-hidden md:rounded-[32px] md:bg-transparent lg:w-[400px]"
    >
      {/* Na telefonie treść gaśnie pod logo i pogodą, zamiast przewijać się pod nimi */}
      <div className="h-full overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent_calc(max(1rem,env(safe-area-inset-top))+40px),black_calc(max(1rem,env(safe-area-inset-top))+64px))] md:[mask-image:none] px-4 pb-[calc(max(1.25rem,env(safe-area-inset-bottom))+96px)] pt-[calc(max(1rem,env(safe-area-inset-top))+64px)] md:karta md:rounded-[32px] md:p-6">
        <h1 className="text-[30px] font-extrabold leading-[1.1] tracking-[-0.035em] md:text-[26px]">
          Przejażdżki na dziś
        </h1>
        <p className="mt-1 text-sm text-tekst-2">Ułożone z Twoich tematów, start spod 42 Warsaw</p>

        <div
          role="radiogroup"
          aria-label="Czas przejażdżki"
          className="mt-4 flex rounded-[14px] bg-tekst/[0.06] p-[3px]"
        >
          {SEGMENTS.map((value) => {
            const isActive = value === nearest;
            return (
              // biome-ignore lint/a11y/useSemanticElements: segmentowy przełącznik, nie lista radio
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => {
                  if (!isActive) haptic(4);
                  onDurationChange(value);
                }}
                className={`relative h-[34px] flex-1 rounded-[11px] text-sm font-semibold transition-colors duration-200 active:scale-[0.97] ${
                  isActive ? "text-tekst" : "text-tekst-2"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="segment-czasu"
                    transition={SPRING}
                    className="absolute inset-0 rounded-[inherit] bg-white shadow-[0_1px_3px_rgba(16,43,42,0.12)]"
                  />
                )}
                <span className="relative">{value === 240 ? "4 h+" : formatDuration(value)}</span>
              </button>
            );
          })}
        </div>

        {lastRoute.length > 0 && (
          <button
            type="button"
            onClick={onOpenLastRoute}
            className="mt-4 flex w-full items-center gap-3 rounded-[20px] bg-mieta-jasna px-4 py-3 text-left transition-transform active:scale-[0.98]"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-glebia text-white">
              <ArrowRightIcon className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-bold">Wróć do swojej trasy</span>
              <span className="block truncate text-[13px] text-tekst-2">
                {lastRoute.length} opowieści · {lastRoute[0].name}
              </span>
            </span>
          </button>
        )}

        <FeaturedRide route={preview} failed={failed} onStart={() => onStart(preview)} />

        <h2 className="etykieta mt-6">Wkrótce</h2>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {UPCOMING_RIDES.map((ride) => (
            <UpcomingRide key={ride.id} ride={ride} />
          ))}
        </div>
      </div>
    </motion.section>
  );
}

type FeaturedRideProps = {
  route: Route | null;
  /** Planer nie odpowiedział: karta zostaje, a start spróbuje zaplanować trasę jeszcze raz. */
  failed: boolean;
  onStart: () => void;
};

function FeaturedRide({ route, failed, onStart }: FeaturedRideProps) {
  // Kolejne linie bez powtórzeń z rzędu: 22 → 1 → 10
  const legs = (route?.legs ?? []).filter(
    (leg, index, all) => index === 0 || leg.line !== all[index - 1].line,
  );
  const places = route?.places ?? [];

  return (
    <article className="relative mt-4 overflow-hidden rounded-[24px] bg-white shadow-[0_1px_2px_rgba(16,43,42,0.05),0_10px_30px_rgba(16,43,42,0.10)]">
      <div className="relative aspect-[5/3] w-full bg-mapa">
        {route ? (
          <RouteThumb
            key={route.id}
            line={routeLine(route)}
            stops={places.map((place) => [place.position.lng, place.position.lat])}
            className="absolute inset-0 size-full"
          />
        ) : (
          <TramIcon
            className={`absolute inset-0 m-auto size-10 text-tekst-3 ${failed ? "" : "animate-pulse"}`}
          />
        )}
        <span className="szklo absolute left-3 top-3 flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold text-glebia-ciemna">
          <span className="size-2 rounded-full bg-glebia" />
          Start: 42 Warsaw
        </span>
      </div>

      <div className="relative px-4 pb-4 pt-3.5">
        <motion.button
          type="button"
          aria-label="Ruszaj: Wola, której nie ma"
          onClick={() => {
            haptic();
            onStart();
          }}
          whileTap={{ scale: 0.92 }}
          transition={SPRING}
          className="absolute -top-7 right-4 grid size-14 place-items-center rounded-full border-[3px] border-white bg-koral text-white shadow-[0_6px_16px_rgba(242,117,95,0.4)]"
        >
          <PlayIcon className="ml-0.5 size-[22px]" />
        </motion.button>

        <h3 className="pr-16 text-[20px] font-extrabold tracking-[-0.02em]">Wola, której nie ma</h3>
        {route ? (
          <>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-tekst-2">
              <span className="tabular-nums">{formatDuration(Math.round(route.totalMin))}</span>
              <span aria-hidden="true">·</span>
              {legs.map((leg, index) => (
                <span key={`${leg.line}-${leg.departAt}`} className="flex items-center gap-1.5">
                  {index > 0 && <span aria-hidden="true">→</span>}
                  <LineBadge line={leg.line} mode={leg.mode} />
                </span>
              ))}
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{places.length} opowieści</span>
            </div>
            <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-tekst-2">
              Po drodze: {places.map((place) => place.name).join(", ")}
            </p>
          </>
        ) : (
          <p className="mt-1 text-[13px] text-tekst-2">
            {failed ? "Trasę ułożę, gdy ruszysz." : "Układam trasę…"}
          </p>
        )}
      </div>
    </article>
  );
}

function UpcomingRide({ ride }: { ride: RidePreview }) {
  return (
    <article className="overflow-hidden rounded-[20px] bg-white shadow-[0_1px_2px_rgba(16,43,42,0.05),0_6px_18px_rgba(16,43,42,0.08)]">
      <RouteThumb
        line={ride.line}
        strokeWidth={6}
        color={ride.id === "praga" ? KORAL : undefined}
        className="aspect-[4/3] w-full opacity-80"
      />
      <div className="px-3 pb-3 pt-2">
        <h3 className="text-[14.5px] font-extrabold leading-tight tracking-[-0.01em]">
          {ride.title}
        </h3>
        <p className="mt-0.5 text-xs text-tekst-2">ok. {formatDuration(ride.durationMin)}</p>
      </div>
    </article>
  );
}

/** Numer linii ZTM w barwach pojazdu: tramwaj czerwony, autobus granatowy (jak w makiecie D). */
function LineBadge({ line, mode }: { line: string; mode: "tram" | "bus" }) {
  return (
    <span
      className={`inline-grid h-5 min-w-[26px] place-items-center rounded-[5px] px-1 text-[11.5px] font-extrabold text-white ${
        mode === "tram" ? "bg-[#C8102E]" : "bg-[#1F2A44]"
      }`}
    >
      {line}
    </span>
  );
}
