"use client";

import type { Route } from "@sawa/shared";
import { motion } from "motion/react";
import { Spinner } from "@/components/waiting";
import { useT } from "@/features/i18n";
import { haptic, SPRING } from "../lib/device";
import { formatDuration } from "../lib/format";
import { ShuffleIcon } from "./icons";
import { Journey } from "./line-badge";

type RouteChoicesProps = {
  /** Trasy z jednej odpowiedzi planera (lib/route-choices.ts), pierwsza to jego wybór. */
  choices: Route[];
  selectedId: string;
  /** Wybrana trasa trafia na mapę; opowieści rozgrzewa dopiero ona. */
  onSelect: (route: Route) => void;
  /** „Losuj inną”: nowy seed i miejsca pokazanych tras do ominięcia. */
  onShuffle: () => void;
  shuffling: boolean;
  shuffleFailed: boolean;
};

const storiesEn = (count: number) => `${count} ${count === 1 ? "story" : "stories"}`;

/**
 * Propozycje tras przed startem (#197): poziomy pasek kart nad mapą (czas, środki transportu,
 * liczba opowieści, miejsca po drodze) i „Losuj inną”. Mapa pokazuje wybraną kartę.
 */
export function RouteChoices({
  choices,
  selectedId,
  onSelect,
  onShuffle,
  shuffling,
  shuffleFailed,
}: RouteChoicesProps) {
  const t = useT();
  return (
    <motion.section
      aria-label={t("Propozycje tras", "Route options")}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={SPRING}
      className="pointer-events-none absolute inset-x-0 top-[calc(max(1rem,env(safe-area-inset-top))+60px)] z-20 md:inset-x-auto md:right-6 md:top-6 md:w-[380px]"
    >
      <div
        role="radiogroup"
        aria-label={t("Wybierz trasę", "Pick a route")}
        className="pointer-events-auto flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto overscroll-x-contain px-4 pb-2 [scrollbar-width:none] md:scroll-px-0 md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {choices.map((route, index) => (
          <ChoiceCard
            key={route.id}
            route={route}
            index={index}
            isSelected={route.id === selectedId}
            onSelect={() => {
              if (route.id !== selectedId) haptic(4);
              onSelect(route);
            }}
          />
        ))}
        <motion.button
          type="button"
          onClick={() => {
            haptic();
            onShuffle();
          }}
          disabled={shuffling}
          whileTap={{ scale: 0.96 }}
          transition={SPRING}
          className="szklo flex w-[112px] shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-[20px] px-3 py-3 text-center text-[13px] font-bold text-glebia-ciemna disabled:opacity-70"
        >
          {shuffling ? <Spinner className="size-5" /> : <ShuffleIcon className="size-5" />}
          <span>{t("Losuj inną", "Shuffle")}</span>
          {shuffleFailed && !shuffling && (
            <span aria-live="polite" className="text-[11px] font-medium text-tekst-2">
              {t("Nie wyszło, jeszcze raz?", "Didn't work, again?")}
            </span>
          )}
        </motion.button>
      </div>
    </motion.section>
  );
}

type ChoiceCardProps = {
  route: Route;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
};

function ChoiceCard({ route, index, isSelected, onSelect }: ChoiceCardProps) {
  const t = useT();
  const count = route.places.length;
  return (
    // biome-ignore lint/a11y/useSemanticElements: karta wyboru trasy, nie pole radio
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={onSelect}
      className={`relative w-[min(260px,72vw)] shrink-0 snap-start rounded-[20px] bg-powierzchnia px-3.5 py-3 text-left shadow-[0_1px_2px_rgba(16,43,42,0.06),0_8px_24px_rgba(16,43,42,0.12)] transition-transform duration-150 active:scale-[0.98] md:w-[240px]`}
    >
      {isSelected && (
        <motion.span
          layoutId="wybrana-trasa"
          transition={SPRING}
          aria-hidden="true"
          // Obwódka do środka: pasek kart przewija się w poziomie i przycina wszystko poza nim.
          className="absolute inset-0 rounded-[inherit] ring-2 ring-glebia ring-inset"
        />
      )}
      <span className="flex items-baseline justify-between gap-2">
        <span className="etykieta">{t(`Trasa ${index + 1}`, `Route ${index + 1}`)}</span>
        <span className="text-[15px] font-extrabold tabular-nums tracking-[-0.01em]">
          {formatDuration(Math.round(route.totalMin))}
        </span>
      </span>
      {/* Linie, które się nie mieszczą, gasną przy krawędzi zamiast uciętej plakietki. */}
      <span className="mt-1.5 flex h-5 items-center gap-1 overflow-hidden text-[12px] text-tekst-2 [mask-image:linear-gradient(to_right,#000_calc(100%-28px),transparent)]">
        <Journey legs={route.legs} />
      </span>
      <span className="mt-1.5 block truncate text-[12.5px] text-tekst-2">
        <span className="font-semibold text-tekst tabular-nums">
          {t(`${count} opowieści`, storiesEn(count))}
        </span>
        {count > 0 && <> · {route.places.map((place) => place.name).join(", ")}</>}
      </span>
    </button>
  );
}
