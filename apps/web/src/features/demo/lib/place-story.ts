"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Listener } from "./api-data";
import { type Clip, fetchClip, useRememberHeard } from "./story-player";

/** Poza trasą nikt nie wyznacza okna, więc Sawa mówi krótko: jak zajawka. */
export const PLACE_STORY_SEC = 45;
const WORDS_PER_SEC = 2.5;

export type PlaceStoryState = "idle" | "loading" | "playing" | "paused" | "failed";

/**
 * Opowieść Sawy o jednym miejscu z karty: ładuje się dopiero po dotknięciu „Posłuchaj”.
 * Postęp z dźwięku; bez głosu z długości tekstu (jak w odtwarzaczu trasy).
 */
export function usePlaceStory(placeId: string, listener: Listener) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [clip, setClip] = useState<Clip | null>(null);
  const [state, setState] = useState<PlaceStoryState>("idle");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    const onEnded = () => {
      setProgress(100);
      setState("paused");
    };
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.pause();
      audio.removeAttribute("src");
    };
  }, []);

  useEffect(() => () => void (clip?.audioUrl && URL.revokeObjectURL(clip.audioUrl)), [clip]);

  useEffect(() => {
    if (state !== "playing") return;
    const audio = audioRef.current;
    const timerMs = clip ? (clip.text.split(/\s+/).length / WORDS_PER_SEC) * 1000 : 0;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      if (clip?.audioUrl && audio) {
        if (audio.duration > 0) setProgress((audio.currentTime / audio.duration) * 100);
      } else if (timerMs > 0) {
        setProgress((current) => {
          const next = Math.min(100, current + (delta / timerMs) * 100);
          if (next >= 100) setState("paused");
          return next;
        });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [state, clip]);

  const start = useCallback((next: Clip) => {
    const audio = audioRef.current;
    if (!next.audioUrl || !audio) {
      setState("playing");
      return;
    }
    if (audio.src !== next.audioUrl) audio.src = next.audioUrl;
    // Safari blokuje dźwięk, który nie startuje w dotknięciu; wtedy czeka na drugi tap.
    audio
      .play()
      .then(() => setState("playing"))
      .catch(() => setState("paused"));
  }, []);

  useRememberHeard(clip, progress);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (state === "loading") return;
    if (state === "playing") {
      audio?.pause();
      setState("paused");
      return;
    }
    if (clip) {
      if (progress >= 100) {
        setProgress(0);
        if (audio) audio.currentTime = 0;
      }
      start(clip);
      return;
    }
    setState("loading");
    fetchClip(placeId, listener, PLACE_STORY_SEC)
      .then((next) => {
        setClip(next);
        start(next);
      })
      .catch(() => setState("failed"));
  }, [state, clip, progress, placeId, listener, start]);

  return { state, text: clip?.text ?? null, progress, toggle };
}
