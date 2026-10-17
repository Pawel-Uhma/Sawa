"use client";

import type { Interest, Place } from "@sawa/shared";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useState } from "react";
import { SPRING } from "../lib/device";
import { usePlaceStory } from "../lib/place-story";
import { CloseButton, cleanFact, KindLine, ListenButton, Sources, splitName } from "./place-card";

type VariantProps = { place: Place; interests: Interest[]; onClose: () => void };

/** Pierwsza ciekawostka, a bez niej pierwszy fakt: to Sawa mówi w dymku, zanim ktoś cokolwiek kliknie. */
export function sawaTeaser(place: Place): string | null {
  const line = place.trivia[0] ?? place.facts[0];
  return line ? cleanFact(line) : null;
}

/**
 * B · Sawa opowiada: mała karta, Sawa wychyla się zza niej z jedną ciekawostką,
 * a główną akcją jest jej głos. Fakty dopiero na żądanie.
 */
export function PlaceCardB({ place, interests, onClose }: VariantProps) {
  const story = usePlaceStory(place.id, interests);
  const [showFacts, setShowFacts] = useState(false);
  const photo = place.photos[0];

  return (
    <div className="px-[18px] pb-[18px] pt-5 md:px-6 md:pb-6">
      <div className="flex items-center gap-3">
        {photo ? (
          // biome-ignore lint/performance/noImgElement: zdjęcia z wielu archiwów, next/image wymagałby każdej domeny w konfiguracji
          <img
            src={photo.url}
            alt=""
            draggable={false}
            className="size-14 shrink-0 rounded-2xl bg-tlo-2 object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <KindLine place={place} />
          <h2 className="mt-0.5 line-clamp-2 text-[19px] font-extrabold leading-tight tracking-[-0.02em]">
            {splitName(place.name).title}
          </h2>
        </div>
        <CloseButton onClick={onClose} />
      </div>

      <div className="mt-4">
        <ListenButton state={story.state} progress={story.progress} onToggle={story.toggle} />
      </div>

      <AnimatePresence initial={false}>
        {story.text && (
          <motion.p
            key="story"
            aria-live="polite"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={SPRING}
            className="overflow-hidden text-[15px] leading-relaxed text-tekst-2"
          >
            <span className="block pt-3">{story.text}</span>
          </motion.p>
        )}
      </AnimatePresence>

      {place.facts.length > 0 && (
        <button
          type="button"
          aria-expanded={showFacts}
          onClick={() => setShowFacts((isShown) => !isShown)}
          className="-ml-2 mt-2 rounded-full px-2 py-1.5 text-[14px] font-bold text-glebia hover:bg-mieta-jasna"
        >
          {showFacts ? "Schowaj fakty" : `Fakty i źródła (${place.facts.length})`}
        </button>
      )}

      <AnimatePresence initial={false}>
        {showFacts && (
          <motion.div
            key="facts"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={SPRING}
            className="overflow-hidden"
          >
            <ol className="mt-2 space-y-2.5">
              {place.facts.map((fact, index) => (
                <li key={fact} className="flex gap-2.5 text-[14px] leading-relaxed text-tekst">
                  <span className="w-4 shrink-0 text-right font-bold text-tekst-3 tabular-nums">
                    {index + 1}
                  </span>
                  {cleanFact(fact)}
                </li>
              ))}
            </ol>
            <div className="mt-4">
              <Sources place={place} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Sawa i dymek nad kartą B. Dymek rośnie od ogonka, czyli od Sawy. */
export function PlaceCardBAbove({ place }: { place: Place }) {
  const teaser = sawaTeaser(place);
  return (
    <div className="pointer-events-none relative h-[118px] md:h-[128px]">
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...SPRING, delay: 0.1 }}
        className="absolute -bottom-[30px] left-1 w-[104px] md:w-[112px]"
      >
        <Image
          src="/onboarding/sawa-sekret.webp"
          alt=""
          width={720}
          height={720}
          draggable={false}
          className="h-auto w-full drop-shadow-[0_10px_14px_rgba(16,43,42,0.22)]"
        />
      </motion.div>
      {teaser && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...SPRING, delay: 0.2 }}
          style={{ transformOrigin: "0% 100%" }}
          className="szklo absolute bottom-5 left-[108px] right-1 rounded-[20px_20px_20px_6px] px-4 py-2.5 md:left-[116px]"
        >
          <p className="etykieta text-glebia">Wiesz, że…</p>
          <p className="mt-0.5 line-clamp-3 text-[14px] font-semibold leading-snug text-tekst">
            {teaser}
          </p>
        </motion.div>
      )}
    </div>
  );
}
