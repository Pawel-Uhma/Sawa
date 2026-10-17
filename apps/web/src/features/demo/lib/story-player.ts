"use client";

import type { Story } from "@sawa/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Listener } from "./api-data";
import { getMemory, HEARD_AT_PROGRESS, rememberStory } from "./memory";
import type { MockStop } from "./mock-data";
import { etaSecOf } from "./ride-clock";

/** Polish speech in ElevenLabs runs at about 2.5 words a second (same as the API). */
const WORDS_PER_SEC = 2.5;
/** Without a next stop Sawa gets a medium story. */
const LAST_STOP_SEC = 75;
const MIN_TARGET_SEC = 20;
const MAX_TARGET_SEC = 600;
/** When even the story text fails, the card waits this long and moves on. */
const FAILED_STORY_MS = 6000;

/** One story: text for the card, mp3 when the voice answered, and what it told (for memory). */
export type Clip = {
  text: string;
  audioUrl: string | null;
  told: Pick<Story, "placeId" | "factIds" | "contextIds"> & { placeName?: string };
};

/**
 * Sawa may talk until the next stop: the planner's window (it knows the story style's limits),
 * else the time between the two stops.
 */
export function targetSecFor(stops: readonly MockStop[], index: number): number {
  const stop = stops[index];
  const next = stops[index + 1];
  const sec = stop?.windowSec ?? (stop && next ? etaSecOf(next) - etaSecOf(stop) : LAST_STOP_SEC);
  return Math.min(MAX_TARGET_SEC, Math.max(MIN_TARGET_SEC, Math.round(sec)));
}

/**
 * A clip depends on who listens and how long Sawa may talk, not only on the stop (T-93):
 * after a change of interests or ride length the old story must not play.
 */
export function clipKey(stopId: string, listener: Listener, targetSec: number): string {
  return JSON.stringify([stopId, targetSec, listener]);
}

/** Asks for a story with what Sawa already told this listener, so it tells something new. */
export async function fetchClip(
  placeId: string,
  listener: Listener,
  targetSec: number,
  placeName?: string,
): Promise<Clip> {
  const memory = getMemory();
  const json = {
    placeId,
    targetSec,
    ...listener,
    heardFacts: memory.places[placeId]?.facts ?? [],
    knownContexts: memory.contexts,
  };
  const res = await api.v1.stories.$post({ json });
  if (!res.ok) throw new Error(`POST /v1/stories: ${res.status}`);
  const { text, factIds, contextIds } = await res.json();
  const told = { placeId, factIds, contextIds, placeName };
  // Without the voice the card still shows the text and runs on a timer.
  try {
    // The same body hits the API's story cache, so the voice reads exactly this text.
    const audio = await api.v1.stories.audio.$post({ json });
    if (!audio.ok) return { text, audioUrl: null, told };
    return { text, audioUrl: URL.createObjectURL(await audio.blob()), told };
  } catch {
    return { text, audioUrl: null, told };
  }
}

/** Remembers a clip once it was heard past `HEARD_AT_PROGRESS`, once per clip. */
export function useRememberHeard(clip: Clip | null, progress: number) {
  const remembered = useRef(new WeakSet<Clip>());
  useEffect(() => {
    if (!clip || progress < HEARD_AT_PROGRESS || remembered.current.has(clip)) return;
    remembered.current.add(clip);
    rememberStory(clip.told);
  }, [clip, progress]);
}

/**
 * Plays the active stop's story with Sawa's voice and prefetches the next one.
 * Progress comes from the audio; without audio, from the text length.
 */
export function useStoryPlayer(
  stops: readonly MockStop[],
  activeIndex: number,
  listener: Listener,
) {
  const cache = useRef(new Map<string, Promise<Clip>>());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [clip, setClip] = useState<Clip | null>(null);
  const [failed, setFailed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  // Id punktu, który jest teraz aktywny: spóźniona odpowiedź z innego punktu nie może nadpisać klipu.
  const activeId = useRef<string | undefined>(undefined);

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
      const targetSec = targetSecFor(stops, index);
      const key = clipKey(stop.id, listener, targetSec);
      let pending = cache.current.get(key);
      if (!pending) {
        pending = fetchClip(stop.id, listener, targetSec, stop.name);
        cache.current.set(key, pending);
        pending.catch(() => cache.current.delete(key));
      }
      return pending;
    },
    [stops, listener],
  );

  useEffect(() => {
    let cancelled = false;
    activeId.current = stops[activeIndex]?.id;
    setClip(null);
    setFailed(false);
    setProgress(0);
    load(activeIndex)
      ?.then((next) => !cancelled && setClip(next))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [activeIndex, load, stops]);

  /**
   * „Więcej o tym miejscu”: uznaje obecną opowieść za znaną i prosi o nową o tym samym miejscu.
   * Pamięć idzie do zapytania, więc Sawa nie powtórzy faktów.
   */
  const more = useCallback(() => {
    const stop = stops[activeIndex];
    if (!stop || !clip) return;
    rememberStory(clip.told);
    cache.current.delete(clipKey(stop.id, listener, targetSecFor(stops, activeIndex)));
    setClip(null);
    setFailed(false);
    setProgress(0);
    setIsPlaying(true);
    load(activeIndex)
      ?.then((next) => activeId.current === stop.id && setClip(next))
      .catch(() => activeId.current === stop.id && setFailed(true));
  }, [stops, activeIndex, clip, load, listener]);

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

  useRememberHeard(clip, progress);

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

  /** Bieżąca opowieść od początku; `keepPlaying: false` to „stop” (pauza na początku). */
  const restart = useCallback(
    (keepPlaying: boolean) => {
      const audio = audioRef.current;
      setProgress(0);
      if (audio && clip?.audioUrl) {
        audio.currentTime = 0;
        // W geście stuknięcia, żeby Safari pozwolił na dźwięk.
        if (keepPlaying) audio.play().catch(() => setIsPlaying(false));
      }
      setIsPlaying(keepPlaying);
    },
    [clip],
  );

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
    restart,
    more,
  };
}

export type StoryPlayer = ReturnType<typeof useStoryPlayer>;
