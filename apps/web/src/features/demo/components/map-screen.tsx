import type { CSSProperties } from "react";
import { formatDuration, sliderPercent } from "../lib/format";
import {
  DURATION_MAX_MIN,
  DURATION_MIN_MIN,
  DURATION_STEP_MIN,
  INTERESTS,
  MOCK_PLACES,
  PLACEHOLDER_WEATHER,
} from "../lib/mock-data";
import { Logo } from "./logo";
import { MockMap } from "./mock-map";
import { PrimaryButton } from "./primary-button";

type MapScreenProps = {
  interests: string[];
  durationMin: number;
  onDurationChange: (durationMin: number) => void;
  onEditInterests: () => void;
  onGenerate: () => void;
};

export function MapScreen({
  interests,
  durationMin,
  onDurationChange,
  onEditInterests,
  onGenerate,
}: MapScreenProps) {
  const labels = interests
    .map((key) => INTERESTS.find((item) => item.key === key)?.label)
    .filter(Boolean)
    .join(", ");

  return (
    <div className="relative h-dvh overflow-hidden md:grid md:grid-cols-[420px_1fr]">
      {/* Mapa: na cały ekran na telefonie, prawa kolumna na desktopie */}
      <div className="absolute inset-0 md:relative md:order-2">
        <MockMap places={MOCK_PLACES} />
      </div>

      {/* Pasek górny (telefon) */}
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))] md:hidden">
        <div className="pointer-events-auto szklo flex h-12 items-center rounded-full px-4">
          <Logo className="text-xl" />
        </div>
        <div className="pointer-events-auto szklo flex h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold text-tekst-2">
          {PLACEHOLDER_WEATHER.tempC}°{" "}
          <span className="font-normal text-tekst-3">{PLACEHOLDER_WEATHER.place}</span>
        </div>
      </header>

      {/* Arkusz (telefon) / panel boczny (desktop) */}
      <section
        aria-label="Plan przejazdu"
        className="wejdz absolute inset-x-0 bottom-0 flex flex-col gap-5 rounded-t-[32px] bg-white/95 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-[0_-10px_40px_rgba(16,43,42,0.14)] backdrop-blur-xl md:static md:order-1 md:h-full md:rounded-none md:px-8 md:pt-10 md:shadow-none"
      >
        <div className="hidden md:block">
          <Logo className="text-3xl" />
          <p className="mt-2 text-sm text-tekst-3">
            {PLACEHOLDER_WEATHER.tempC}° · {PLACEHOLDER_WEATHER.place}
          </p>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold text-tekst-3">Przejażdżka</p>
            <p className="text-3xl font-extrabold tracking-tight tabular-nums">
              {formatDuration(durationMin)}
            </p>
          </div>
          <span className="text-sm text-tekst-3">ok. {Math.round(durationMin / 25)} punktów</span>
        </div>

        <div className="flex flex-col gap-2">
          <input
            type="range"
            className="suwak"
            aria-label="Czas przejażdżki"
            min={DURATION_MIN_MIN}
            max={DURATION_MAX_MIN}
            step={DURATION_STEP_MIN}
            value={durationMin}
            onChange={(event) => onDurationChange(Number(event.target.value))}
            style={{ "--postep": `${sliderPercent(durationMin)}%` } as CSSProperties}
          />
          <div className="flex justify-between text-xs font-medium text-tekst-3">
            <span>30 min</span>
            <span>1 h</span>
            <span>2 h</span>
            <span>3 h</span>
            <span>4 h</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-tlo-2 px-4 py-3 text-sm">
          <p className="min-w-0 truncate text-tekst-2">
            <span className="font-semibold text-tekst">Tematy: </span>
            {labels || "wszystkie"}
          </p>
          <button
            type="button"
            onClick={onEditInterests}
            className="shrink-0 rounded-full px-2 py-1 font-semibold text-glebia transition-opacity active:opacity-60"
          >
            Zmień
          </button>
        </div>

        <PrimaryButton onClick={onGenerate}>Wyznacz trasę</PrimaryButton>
      </section>
    </div>
  );
}
