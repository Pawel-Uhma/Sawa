"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Listener } from "./api-data";
import {
  audioProgress,
  type Clip,
  fetchClip,
  speakingMs,
  useLiveText,
  useRememberHeard,
} from "./story-player";

/** Poza trasą nikt nie wyznacza okna, więc Sawa mówi krótko: jak zajawka. */
export const PLACE_STORY_SEC = 45;

export type PlaceStoryState = "idle" | "loading" | "playing" | "paused" | "failed";

/**
 * Opowieść Sawy o jednym miejscu z karty: ładuje się dopiero po dotknięciu „Posłuchaj”.
 * Głos płynie strumieniem, zanim tekst jest gotowy. Postęp z dźwięku; bez głosu z długości
 * tekstu (jak w odtwarzaczu trasy).
 */
export function usePlaceStory(placeId: string, listener: Listener) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [clip, setClip] = useState<Clip | null>(null);
  const [state, setState] = useState<PlaceStoryState>("idle");
  const [progress, setProgress] = useState(0);
  const [voiceFailed, setVoiceFailed] = useState(false);
  const live = useLiveText(clip);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    const onEnded = () => {
      setProgress(100);
      setState("paused");
    };
    // Bez głosu (ElevenLabs padł) opowieść biegnie dalej na liczniku z tekstu.
    const onError = () => audio.getAttribute("src") && setVoiceFailed(true);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.pause();
      audio.removeAttribute("src");
    };
  }, []);

  useEffect(() => {
    if (live.failed) setState("failed");
  }, [live.failed]);

  useEffect(() => {
    if (state !== "playing") return;
    // Bez `?voice=1` albo gdy głos padł, licznik z tekstu.
    const audio = voiceFailed || !clip?.audioUrl ? null : audioRef.current;
    // Bez głosu licznik czeka na cały tekst, bo dopiero on mówi, ile czekać.
    if (!audio && !live.done) return;
    const timerMs = speakingMs(live.text);
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      if (audio) {
        if (!audio.ended) setProgress(audioProgress(audio, live));
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
  }, [state, live, voiceFailed, clip]);

  const start = useCallback((next: Clip) => {
    const audio = audioRef.current;
    if (!audio || !next.audioUrl) {
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

  useRememberHeard(clip?.id, live.told, progress);

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
        if (audio && !voiceFailed) audio.currentTime = 0;
      }
      if (voiceFailed || !clip.audioUrl) setState("playing");
      else start(clip);
      return;
    }
    setState("loading");
    fetchClip(placeId, listener, PLACE_STORY_SEC)
      .then((next) => {
        setClip(next);
        start(next);
      })
      .catch(() => setState("failed"));
  }, [state, clip, progress, placeId, listener, start, voiceFailed]);

  return { state, text: live.text, progress, toggle };
}
