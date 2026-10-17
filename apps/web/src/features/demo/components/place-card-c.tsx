"use client";

import type { Interest, Place } from "@sawa/shared";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { placeKindColor } from "@/features/map";
import { SPRING } from "../lib/device";
import { usePlaceStory } from "../lib/place-story";
import { PauseIcon, PlayIcon } from "./icons";
import {
  CloseButton,
  cleanFact,
  KindLine,
  photoCredit,
  splitName,
  TodayNearby,
} from "./place-card";

type VariantProps = { place: Place; interests: Interest[]; onClose: () => void };

type Era = "then" | "now";

/**
 * C · Wtedy i dziś: archiwalne zdjęcie na całą szerokość, przełącznik „wtedy / dziś”
 * i fakty jako karty przesuwane palcem w bok. Najbardziej wizualna.
 */
export function PlaceCardC({ place, interests, onClose }: VariantProps) {
  const story = usePlaceStory(place.id, interests);
  const [era, setEra] = useState<Era>("then");
  const photo = place.photos[0];
  const isPlaying = story.state === "playing";

  return (
    <div className="pb-5">
      <div className="relative">
        {photo ? (
          // biome-ignore lint/performance/noImgElement: zdjęcia z wielu archiwów, next/image wymagałby każdej domeny w konfiguracji
          <img
            src={photo.url}
            alt={photo.caption ?? place.name}
            draggable={false}
            className="aspect-[16/10] w-full rounded-t-[inherit] bg-tlo-2 object-cover sepia-[0.15]"
          />
        ) : (
          <div
            aria-hidden="true"
            className="aspect-[16/10] w-full rounded-t-[inherit] opacity-90"
            style={{
              background: `linear-gradient(135deg, ${placeKindColor(place.kind)}, #17706f)`,
            }}
          />
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" />
        <div className="absolute right-3 top-3">
          <CloseButton onClick={onClose} onPhoto />
        </div>
        {photo?.year && (
          <span className="absolute left-3 top-3 rounded-full bg-black/35 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md tabular-nums">
            {photo.year}
          </span>
        )}
        {photo && (
          <p className="absolute bottom-2 left-4 right-20 line-clamp-1 text-[11px] text-white/80">
            {photoCredit(photo)}
          </p>
        )}
        <motion.button
          type="button"
          onClick={story.toggle}
          whileTap={{ scale: 0.92 }}
          transition={SPRING}
          aria-label={isPlaying ? "Pauza" : "Posłuchaj Sawy"}
          className="absolute -bottom-7 right-4 flex size-14 items-center justify-center rounded-full bg-koral text-white shadow-[0_6px_16px_rgba(242,117,95,0.4)]"
        >
          <svg aria-hidden="true" viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
            <circle
              cx="28"
              cy="28"
              r="26"
              fill="none"
              stroke="white"
              strokeOpacity={story.state === "idle" ? 0 : 0.9}
              strokeWidth="3"
              strokeDasharray={163.4}
              strokeDashoffset={163.4 * (1 - story.progress / 100)}
              strokeLinecap="round"
            />
          </svg>
          <span className={story.state === "loading" ? "animate-pulse" : ""}>
            {isPlaying ? (
              <PauseIcon className="size-6" />
            ) : (
              <PlayIcon className="size-6 translate-x-[1px]" />
            )}
          </span>
        </motion.button>
      </div>

      <div className="px-[18px] pt-4 md:px-6">
        <KindLine place={place} className="pr-16" />
        <h2 className="mt-1 pr-16 text-[22px] font-extrabold leading-tight tracking-[-0.025em]">
          {splitName(place.name).title}
        </h2>

        {story.text && (
          <p aria-live="polite" className="wejdz mt-2 text-[14px] leading-relaxed text-tekst-2">
            {story.text}
          </p>
        )}

        <EraSwitch era={era} onChange={setEra} />

        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={era}
            initial={{ opacity: 0, x: era === "now" ? 24 : -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: era === "now" ? -24 : 24 }}
            transition={SPRING}
            className="mt-3"
          >
            {era === "then" ? <ThenView place={place} /> : <NowView place={place} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function EraSwitch({ era, onChange }: { era: Era; onChange: (era: Era) => void }) {
  const options: { key: Era; label: string }[] = [
    { key: "then", label: "Wtedy" },
    { key: "now", label: "Dziś" },
  ];
  return (
    <div role="tablist" className="mt-4 flex rounded-full bg-tlo-2 p-1">
      {options.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={era === key}
          onClick={() => onChange(key)}
          className={`relative h-9 flex-1 rounded-full text-[14px] font-bold transition-colors ${
            era === key ? "text-glebia" : "text-tekst-3"
          }`}
        >
          {era === key && (
            <motion.span
              layoutId="karta-c-era"
              transition={SPRING}
              className="absolute inset-0 rounded-full bg-white shadow-[0_1px_3px_rgba(16,43,42,0.12)]"
            />
          )}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  );
}

function ThenView({ place }: { place: Place }) {
  const facts = place.facts.map(cleanFact);
  const names = [
    ...new Set([place.addressHistoric, ...place.formerNames.map((n) => n.name)].filter(Boolean)),
  ].slice(0, 3);
  return (
    <div className="space-y-3">
      {names.length > 0 && <p className="text-[14px] text-tekst-2">{names.join(" · ")}</p>}
      {facts.length > 0 && (
        <ul className="-mx-[18px] flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-[18px] pb-1 [scrollbar-width:none] md:-mx-6 md:px-6">
          {facts.map((fact, index) => (
            <li
              key={fact}
              className="w-[82%] shrink-0 snap-start rounded-2xl bg-tlo-2 p-3.5 text-[14px] leading-relaxed text-tekst"
            >
              <span className="etykieta block text-koral">
                {index + 1} / {facts.length}
              </span>
              <span className="mt-1 line-clamp-6 block">{fact}</span>
            </li>
          ))}
        </ul>
      )}
      {place.people.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {place.people.slice(0, 6).map((person) => (
            <li
              key={person.name}
              className="rounded-full bg-mieta-jasna px-2.5 py-1 text-xs font-bold text-glebia-ciemna"
            >
              {person.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NowView({ place }: { place: Place }) {
  const exists =
    place.stillExists === null ? null : place.stillExists ? "Stoi do dziś" : "Nie przetrwało";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {exists && (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              place.stillExists ? "bg-mieta-jasna text-glebia-ciemna" : "bg-koral/15 text-koral"
            }`}
          >
            {exists}
          </span>
        )}
        {place.addressToday && (
          <span className="text-[14px] text-tekst-2">{place.addressToday}</span>
        )}
      </div>
      <TodayNearby place={place} />
      {place.todayNearby.length === 0 && !place.addressToday && (
        <p className="text-[14px] text-tekst-3">Nie wiemy jeszcze, co tu stoi dziś.</p>
      )}
    </div>
  );
}
