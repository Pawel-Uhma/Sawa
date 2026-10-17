"use client";

import type { Place } from "@sawa/shared";
import { useState } from "react";
import { useLang, useT } from "@/features/i18n";
import { placeTopic } from "@/features/map";
import { placeTagLabel } from "@/lib/interest-labels";
import type { Listener } from "../lib/api-data";
import { haptic } from "../lib/device";
import { usePlaceStory } from "../lib/place-story";
import { topicStyle } from "../lib/topic-style";
import { PinIcon } from "./icons";
import {
  CloseButton,
  cleanFact,
  KindLine,
  ListenButton,
  Sources,
  splitName,
  TodayNearby,
} from "./place-card";

const FACTS_PREVIEW = 3;

type PlaceDetailsProps = {
  place: Place;
  listener: Listener;
  onClose: () => void;
  /** Ustawia miejsce jako cel przejażdżki; brak, gdy miejsce nie ma współrzędnych. */
  onRideTo?: (name: string) => void;
};

/** Treść karty miejsca, jak arkusz w Mapach Apple: nagłówek, główna akcja, pasek zdjęć, a niżej wszystko, co wiemy o miejscu. */
export function PlaceDetails({ place, listener, onClose, onRideTo }: PlaceDetailsProps) {
  const t = useT();
  const lang = useLang();
  const story = usePlaceStory(place.id, listener);
  const [showAll, setShowAll] = useState(false);
  const facts = (showAll ? place.facts : place.facts.slice(0, FACTS_PREVIEW)).map(cleanFact);
  const { title, aside } = splitName(place.name);
  const address = [aside, place.addressToday ?? place.addressHistoric].filter(Boolean).join(" · ");

  return (
    <div className="px-[18px] pb-5 pt-6 md:px-6">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <KindLine place={place} />
          <h2 className="mt-1 text-[24px] font-extrabold leading-[1.15] tracking-[-0.025em] text-tekst">
            {title}
          </h2>
          {address && <p className="mt-1 text-[14px] text-tekst-2">{address}</p>}
        </div>
        <CloseButton onClick={onClose} />
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <ListenButton state={story.state} progress={story.progress} onToggle={story.toggle} />
          </div>
          {onRideTo && (
            <button
              type="button"
              onClick={() => {
                haptic();
                onRideTo(title);
              }}
              className="flex h-14 shrink-0 items-center gap-1.5 rounded-[18px] bg-mieta-jasna px-4 text-[15px] font-bold text-glebia transition-transform active:scale-[0.96]"
            >
              <PinIcon className="size-[18px]" />
              {t("Jedź tutaj", "Ride here")}
            </button>
          )}
        </div>
        {story.text && (
          <p aria-live="polite" className="wejdz mt-3 text-[15px] leading-relaxed text-tekst-2">
            {story.text}
          </p>
        )}
      </div>

      {place.photos.length > 0 && (
        <ul className="-mx-[18px] mt-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-[18px] pb-1 [scrollbar-width:none] md:-mx-6 md:px-6">
          {place.photos.map((photo) => (
            <li key={photo.url} className="w-[78%] shrink-0 snap-start first:ml-0 md:w-[85%]">
              <figure>
                {/* biome-ignore lint/performance/noImgElement: zdjęcia z wielu archiwów, next/image wymagałby każdej domeny w konfiguracji */}
                <img
                  src={photo.url}
                  alt={photo.caption ?? place.name}
                  loading="lazy"
                  draggable={false}
                  className="aspect-[4/3] w-full rounded-2xl bg-tlo-2 object-cover"
                />
              </figure>
            </li>
          ))}
        </ul>
      )}

      {place.interests.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {place.interests.map((tag) => {
            // Tag w kolorze swojego tematu, jak obwódka miejsca na mapie
            const topic = placeTopic([tag]);
            return (
              <li
                key={tag}
                style={topic ? topicStyle(topic) : undefined}
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  topic ? "temat bg-(--temat-tlo) text-(--temat)" : "bg-tlo-2 text-tekst-2"
                }`}
              >
                {placeTagLabel(tag, lang)}
              </li>
            );
          })}
        </ul>
      )}

      {facts.length > 0 && (
        <div className="mt-5">
          <h3 className="etykieta">{t("Co tu się działo", "What happened here")}</h3>
          <ul className="mt-2 space-y-2.5">
            {facts.map((fact) => (
              <li key={fact} className="flex gap-2.5 text-[15px] leading-relaxed text-tekst">
                <span
                  aria-hidden="true"
                  className="mt-[9px] size-1.5 shrink-0 rounded-full bg-koral"
                />
                {fact}
              </li>
            ))}
          </ul>
          {place.facts.length > FACTS_PREVIEW && (
            <button
              type="button"
              onClick={() => setShowAll((isShown) => !isShown)}
              className="-ml-2 mt-2 rounded-full px-2 py-1.5 text-[14px] font-bold text-glebia hover:bg-mieta-jasna"
            >
              {showAll
                ? t("Pokaż mniej", "Show less")
                : t(`Wszystkie fakty (${place.facts.length})`, `All facts (${place.facts.length})`)}
            </button>
          )}
        </div>
      )}

      <div className="mt-5 space-y-5">
        <TodayNearby place={place} />
        <Sources place={place} />
      </div>
    </div>
  );
}
