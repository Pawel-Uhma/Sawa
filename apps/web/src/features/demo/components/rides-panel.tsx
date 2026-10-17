"use client";

import type { LatLng, Route, Travel } from "@sawa/shared";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useT } from "@/features/i18n";
import { planRoute, routeLine } from "../lib/api-data";
import { haptic, SPRING } from "../lib/device";
import { formatDuration } from "../lib/format";
import { type MockStop, type RidePreview, UPCOMING_RIDES } from "../lib/mock-data";
import type { Profile } from "../lib/onboarding";
import type { RideEnd } from "../lib/ride-end";
import { ArrowRightIcon, CloseIcon, PinIcon, PlayIcon, TramIcon } from "./icons";
import { Journey } from "./line-badge";
import { KORAL, RouteThumb } from "./route-thumb";

type RidesPanelProps = {
  profile: Profile;
  /** Start przejażdżki i jego podpis (lib/start-point.ts). */
  origin: LatLng;
  originLabel: string;
  durationMin: number;
  onDurationChange: (durationMin: number) => void;
  /** Koniec trasy wybrany na ekranie głównym; podgląd planuje z nim, żeby start pokazał to samo. */
  rideEnd: RideEnd;
  /** Pieszo albo komunikacją, wybrane na ekranie głównym; podgląd planuje tak samo. */
  travel: Travel;
  /** Trasa wyznaczona wcześniej w tej sesji (pusta, jeśli jeszcze żadnej nie było). */
  lastRoute: MockStop[];
  onOpenLastRoute: () => void;
  /** Powrót na mapę (nie ma już paska zakładek). */
  onClose: () => void;
  /** Start przejażdżki. Dostaje trasę z podglądu, żeby nie planować jej drugi raz; null, gdy podglądu nie ma. */
  onStart: (planned: Route | null) => void;
};

const SEGMENTS = [30, 60, 120, 240];

const storiesEn = (count: number) => `${count} ${count === 1 ? "story" : "stories"}`;

/** Zakładka Przejażdżki (makieta D): gotowe trasy jak odcinki podcastu, przełącznik czasu, ostatnia trasa. */
export function RidesPanel({
  profile,
  origin,
  originLabel,
  durationMin,
  onDurationChange,
  rideEnd,
  travel,
  lastRoute,
  onOpenLastRoute,
  onClose,
  onStart,
}: RidesPanelProps) {
  const t = useT();
  // Podgląd to prawdziwa trasa z planera dla wybranego czasu, więc po starcie widać dokładnie to samo.
  const [preview, setPreview] = useState<Route | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    planRoute(origin, durationMin, profile, rideEnd, travel)
      .then((route) => !cancelled && setPreview(route))
      .catch(() => {
        if (cancelled) return;
        setPreview(null);
        setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [origin, durationMin, profile, rideEnd, travel]);
  const nearest = SEGMENTS.reduce((best, value) =>
    Math.abs(value - durationMin) < Math.abs(best - durationMin) ? value : best,
  );

  return (
    <motion.section
      aria-label={t("Przejażdżki", "Rides")}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={SPRING}
      className="absolute inset-0 z-[15] bg-tlo-2 md:inset-auto md:top-24 md:bottom-6 md:left-6 md:w-[360px] md:overflow-hidden md:rounded-[32px] md:bg-transparent lg:w-[400px]"
    >
      <button
        type="button"
        aria-label={t("Wróć do mapy", "Back to the map")}
        onClick={onClose}
        className="szklo absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 grid size-12 place-items-center rounded-full text-tekst transition-transform duration-100 active:scale-[0.94] md:top-4 md:size-10"
      >
        <CloseIcon className="size-5" />
      </button>
      {/* Na telefonie treść gaśnie pod logo i pogodą, zamiast przewijać się pod nimi */}
      <div className="h-full overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent_calc(max(1rem,env(safe-area-inset-top))+40px),black_calc(max(1rem,env(safe-area-inset-top))+64px))] md:[mask-image:none] px-4 pb-[calc(max(1.25rem,env(safe-area-inset-bottom))+24px)] pt-[calc(max(1rem,env(safe-area-inset-top))+64px)] md:karta md:rounded-[32px] md:p-6">
        <h1 className="text-[30px] font-extrabold leading-[1.1] tracking-[-0.035em] md:text-[26px]">
          {t("Przejażdżki na dziś", "Today's rides")}
        </h1>
        <p className="mt-1 text-sm text-tekst-2">
          {t(
            `Ułożone z Twoich tematów. Start: ${originLabel}`,
            `Built from your topics. Start: ${originLabel}`,
          )}
        </p>

        <div
          role="radiogroup"
          aria-label={t("Czas przejażdżki", "Ride length")}
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
                    className="absolute inset-0 rounded-[inherit] bg-powierzchnia shadow-[0_1px_3px_rgba(16,43,42,0.12)]"
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
              <span className="block text-[15px] font-bold">
                {t("Wróć do swojej trasy", "Back to your route")}
              </span>
              <span className="block truncate text-[13px] text-tekst-2">
                {t(`${lastRoute.length} opowieści`, storiesEn(lastRoute.length))} ·{" "}
                {lastRoute[0].name}
              </span>
            </span>
          </button>
        )}

        <FeaturedRide
          route={preview}
          failed={failed}
          destination={rideEnd.type === "destination" ? rideEnd.name : null}
          onStart={() => onStart(preview)}
        />

        <h2 className="etykieta mt-6">{t("Wkrótce", "Coming soon")}</h2>
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
  /** Nazwa celu, gdy trasa ma się przy nim kończyć. */
  destination: string | null;
  onStart: () => void;
};

function FeaturedRide({ route, failed, destination, onStart }: FeaturedRideProps) {
  const t = useT();
  const places = route?.places ?? [];

  return (
    <article className="relative mt-4 overflow-hidden rounded-[24px] bg-powierzchnia shadow-[0_1px_2px_rgba(16,43,42,0.05),0_10px_30px_rgba(16,43,42,0.10)]">
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
          aria-label={t("Ruszaj: Wola, której nie ma", "Go: the Wola that's gone")}
          onClick={() => {
            haptic();
            onStart();
          }}
          whileTap={{ scale: 0.92 }}
          transition={SPRING}
          className="absolute -top-7 right-4 grid size-14 place-items-center rounded-full border-[3px] border-powierzchnia bg-koral text-white shadow-[0_6px_16px_rgba(242,117,95,0.4)]"
        >
          <PlayIcon className="ml-0.5 size-[22px]" />
        </motion.button>

        <h3 className="pr-16 text-[20px] font-extrabold tracking-[-0.02em]">
          {t("Wola, której nie ma", "The Wola that's gone")}
        </h3>
        {route ? (
          <>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-tekst-2">
              <span className="tabular-nums">{formatDuration(Math.round(route.totalMin))}</span>
              <span aria-hidden="true">·</span>
              <Journey legs={route.legs} />
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {t(`${places.length} opowieści`, storiesEn(places.length))}
              </span>
            </div>
            {destination && (
              <p
                className={`mt-2 inline-flex items-center gap-1 text-[13px] font-semibold ${
                  route.endsAtDestination ? "text-glebia" : "text-tekst"
                }`}
              >
                <PinIcon className="size-4 shrink-0" />
                {route.endsAtDestination
                  ? t(`Do celu: ${destination}`, `To: ${destination}`)
                  : t(
                      `Do celu (${destination}) nie zdążę w tym czasie`,
                      `I can't reach ${destination} in this time`,
                    )}
              </p>
            )}
            <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-tekst-2">
              {t("Po drodze", "On the way")}: {places.map((place) => place.name).join(", ")}
            </p>
          </>
        ) : (
          <p className="mt-1 text-[13px] text-tekst-2">
            {failed
              ? t("Trasę ułożę, gdy ruszysz.", "I'll plan the route when you set off.")
              : t("Układam trasę…", "Planning the route…")}
          </p>
        )}
      </div>
    </article>
  );
}

function UpcomingRide({ ride }: { ride: RidePreview }) {
  const t = useT();
  return (
    <article className="overflow-hidden rounded-[20px] bg-powierzchnia shadow-[0_1px_2px_rgba(16,43,42,0.05),0_6px_18px_rgba(16,43,42,0.08)]">
      <RouteThumb
        line={ride.line}
        strokeWidth={6}
        color={ride.id === "praga" ? KORAL : undefined}
        className="aspect-[4/3] w-full opacity-80"
      />
      <div className="px-3 pb-3 pt-2">
        <h3 className="text-[14.5px] font-extrabold leading-tight tracking-[-0.01em]">
          {t(ride.title, ride.titleEn)}
        </h3>
        <p className="mt-0.5 text-xs text-tekst-2">
          {t("ok.", "approx.")} {formatDuration(ride.durationMin)}
        </p>
      </div>
    </article>
  );
}
