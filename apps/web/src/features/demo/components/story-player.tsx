"use client";

import { useEffect, useState } from "react";
import type { MockStop } from "../lib/mock-data";

// Placeholder: opowieść trwa stały czas. Docelowo długość wynika z czasu do punktu i API (T-42).
const PLACEHOLDER_STORY_MS = 8000;
const TICK_MS = 100;

type StoryPlayerProps = {
  stop: MockStop;
  hasNext: boolean;
  onNext: () => void;
};

export function StoryPlayer({ stop, hasNext, onNext }: StoryPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setProgress((current) => Math.min(100, current + (TICK_MS / PLACEHOLDER_STORY_MS) * 100));
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    if (progress < 100) return;
    if (hasNext) {
      onNext();
    } else {
      setIsPlaying(false);
    }
  }, [progress, hasNext, onNext]);

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-white p-4 shadow-[0_10px_30px_rgba(16,43,42,0.10)]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-tekst-3">
            Opowieść z okna
          </p>
          <p className="truncate text-base font-bold">{stop.name}</p>
        </div>
        <span className="shrink-0 rounded-full bg-mieta-jasna px-3 py-1 text-xs font-semibold text-glebia-ciemna">
          linia {stop.line}
        </span>
      </div>

      <p className="min-h-16 text-[15px] leading-relaxed text-tekst-2">
        Tu pojawi się tekst opowieści z API (placeholder, bez treści Sawy).
      </p>

      <div
        role="progressbar"
        aria-label="Postęp opowieści"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        className="h-1.5 overflow-hidden rounded-full bg-tlo-2"
      >
        <div className="h-full rounded-full bg-glebia" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (!isPlaying && progress >= 100) setProgress(0);
            setIsPlaying((value) => !value);
          }}
          className="flex h-12 flex-1 items-center justify-center rounded-full bg-tlo-2 font-semibold text-tekst transition-transform active:scale-[0.98]"
        >
          {isPlaying ? "Pauza" : "Odtwarzaj"}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          className="flex h-12 flex-1 items-center justify-center rounded-full bg-glebia font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-40"
        >
          Dalej
        </button>
      </div>
    </div>
  );
}
