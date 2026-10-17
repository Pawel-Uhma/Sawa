"use client";

import type { Interest } from "@sawa/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { MockStop } from "./mock-data";

/** Polish speech in ElevenLabs runs at about 2.5 words a second (same as the API). */
const WORDS_PER_SEC = 2.5;
/** Without a next stop Sawa gets a medium story. */
const LAST_STOP_SEC = 75;
const MIN_TARGET_SEC = 20;
const MAX_TARGET_SEC = 600;
/** When even the story text fails, the card waits this long and moves on. */
const FAILED_STORY_MS = 6000;

/** One story: text for the card, mp3 when the voice answered. */
type Clip = { text: string; audioUrl: string | null };

/** Sawa may talk until the next stop. */
function targetSecFor(stops: readonly MockStop[], index: number): number {
  const stop = stops[index];
  const next = stops[index + 1];
  const sec = stop && next ? (next.etaMin - stop.etaMin) * 60 : LAST_STOP_SEC;
  return Math.min(MAX_TARGET_SEC, Math.max(MIN_TARGET_SEC, Math.round(sec)));
}

async function fetchClip(placeId: string, interests: Interest[], targetSec: number): Promise<Clip> {
  const res = await api.v1.stories.$post({ json: { placeId, interests, targetSec } });
  if (!res.ok) throw new Error(`POST /v1/stories: ${res.status}`);
  const { text } = await res.json();
  // Without the voice the card still shows the text and runs on a timer.
  try {
    const audio = await api.v1.speech.$post({ json: { text } });
    if (!audio.ok) return { text, audioUrl: null };
    return { text, audioUrl: URL.createObjectURL(await audio.blob()) };
  } catch {
    return { text, audioUrl: null };
  }
}

/**
 * Plays the active stop's story with Sawa's voice and prefetches the next one.
 * Progress comes from the audio; without audio, from the text length.
 */
export function useStoryPlayer(
  stops: readonly MockStop[],
  activeIndex: number,
  interests: Interest[],
) {
  const cache = useRef(new Map<string, Promise<Clip>>());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [clip, setClip] = useState<Clip | null>(null);
  const [failed, setFailed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    const onEnded = () => setProgress(100);
    audio.addEventListener("ended", onEnded);
    const clips = cache.current;
    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.pause();
      audio.removeAttribute("src");
      for (const pending of clips.values()) {
        pending.then((c) => c.audioUrl && URL.revokeObjectURL(c.audioUrl)).catch(() => {});
      }
    };
  }, []);

  const load = useCallback(
    (index: number) => {
      const stop = stops[index];
      if (!stop) return null;
      let pending = cache.current.get(stop.id);
      if (!pending) {
        pending = fetchClip(stop.id, interests, targetSecFor(stops, index));
        cache.current.set(stop.id, pending);
        pending.catch(() => cache.current.delete(stop.id));
      }
      return pending;
    },
    [stops, interests],
  );

  useEffect(() => {
    let cancelled = false;
    setClip(null);
    setFailed(false);
    setProgress(0);
    load(activeIndex)
      ?.then((next) => !cancelled && setClip(next))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [activeIndex, load]);

  // The next story is ready before the tram gets there.
  useEffect(() => {
    if (clip) load(activeIndex + 1)?.catch(() => {});
  }, [clip, activeIndex, load]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!clip?.audioUrl) {
      audio.pause();
      audio.removeAttribute("src");
      return;
    }
    audio.src = clip.audioUrl;
  }, [clip]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !clip?.audioUrl) return;
    // The browser blocks sound before the first tap; the play button then starts it.
    if (isPlaying) audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  }, [isPlaying, clip]);

  // Progress in animation frames, so the bar moves smoothly
  useEffect(() => {
    if (!isPlaying || (!clip && !failed)) return;
    const audio = audioRef.current;
    const words = clip ? clip.text.split(/\s+/).length : 0;
    const timerMs = clip ? (words / WORDS_PER_SEC) * 1000 : FAILED_STORY_MS;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      if (clip?.audioUrl && audio) {
        if (audio.duration > 0)
          setProgress(Math.min(100, (audio.currentTime / audio.duration) * 100));
      } else {
        setProgress((current) => Math.min(100, current + (delta / timerMs) * 100));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, clip, failed]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    const restart = progress >= 100;
    if (restart) setProgress(0);
    if (!isPlaying && audio && clip?.audioUrl) {
      // Called inside the tap, so Safari lets the sound start.
      if (restart) audio.currentTime = 0;
      audio.play().catch(() => setIsPlaying(false));
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, progress, clip]);

  return {
    text: clip?.text ?? null,
    loading: !clip && !failed,
    failed,
    isPlaying,
    setIsPlaying,
    progress,
    /** Zeruje postęp w tym samym renderze co zmiana punktu, żeby koniec opowieści nie przeskoczył dwóch. */
    rewind: useCallback(() => setProgress(0), []),
    toggle,
  };
}
