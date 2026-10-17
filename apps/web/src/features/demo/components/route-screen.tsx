"use client";

import { useCallback, useState } from "react";
import { formatDuration } from "../lib/format";
import { MOCK_PLACES, type MockStop } from "../lib/mock-data";
import { Logo } from "./logo";
import { MockMap } from "./mock-map";
import { StoryPlayer } from "./story-player";

type RouteScreenProps = {
  durationMin: number;
  stops: MockStop[];
  onBack: () => void;
};

export function RouteScreen({ durationMin, stops, onBack }: RouteScreenProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeStop = stops[activeIndex];
  const hasNext = activeIndex < stops.length - 1;

  const goNext = useCallback(() => {
    setActiveIndex((index) => Math.min(index + 1, stops.length - 1));
  }, [stops.length]);

  return (
    <div className="flex h-dvh flex-col md:grid md:grid-cols-[420px_1fr]">
      {/* Mapa z trasą: górna część na telefonie, prawa kolumna na desktopie */}
      <div className="relative h-[36dvh] shrink-0 overflow-hidden md:order-2 md:h-auto">
        <MockMap places={MOCK_PLACES} routePlaces={stops} />
        <div className="absolute inset-x-0 top-0 flex p-4 pt-[max(1rem,env(safe-area-inset-top))] md:hidden">
          <button
            type="button"
            onClick={onBack}
            className="szklo flex h-11 items-center rounded-full px-4 text-sm font-semibold text-tekst transition-transform active:scale-[0.97]"
          >
            Zmień plan
          </button>
        </div>
      </div>

      {/* Panel: nagłówek, lista punktów, odtwarzacz */}
      <section className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:order-1 md:px-8 md:pt-10">
        <header className="flex items-end justify-between gap-3">
          <div>
            <Logo className="text-2xl md:text-3xl" />
            <p className="mt-1 text-sm text-tekst-3">
              {formatDuration(durationMin)} · {stops.length} punktów
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="hidden h-11 items-center rounded-full px-3 text-sm font-semibold text-glebia transition-opacity active:opacity-60 md:flex"
          >
            Zmień plan
          </button>
        </header>

        <ol className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1" aria-label="Punkty trasy">
          {stops.map((stop, index) => {
            const isActive = index === activeIndex;
            return (
              <li key={stop.id}>
                <button
                  type="button"
                  aria-current={isActive ? "step" : undefined}
                  onClick={() => setActiveIndex(index)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors duration-200 ${
                    isActive
                      ? "bg-white shadow-[0_6px_18px_rgba(16,43,42,0.10)]"
                      : "hover:bg-white/60"
                  }`}
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      isActive ? "bg-koral text-white" : "bg-tlo-2 text-tekst-2"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{stop.name}</span>
                    <span className="block text-xs text-tekst-3">
                      linia {stop.line} · po ok. {stop.etaMin} min
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {activeStop && (
          <StoryPlayer key={activeStop.id} stop={activeStop} hasNext={hasNext} onNext={goNext} />
        )}
      </section>
    </div>
  );
}
