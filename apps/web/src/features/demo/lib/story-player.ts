"use client";

import type { Story } from "@sawa/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Listener } from "./api-data";
import { getMemory, HEARD_AT_PROGRESS, rememberStory } from "./memory";
import type { MockStop } from "./mock-data";

/** Polish speech in ElevenLabs runs at about 2.5 words a second (same as the API). */
const WORDS_PER_SEC = 2.5;
/** Without a next stop Sawa gets a medium story. */
const LAST_STOP_SEC = 75;
const MIN_TARGET_SEC = 20;
const MAX_TARGET_SEC = 600;
/** When even the story text fails, the card waits this long and moves on. */
const FAILED_STORY_MS = 6000;

/** What a story told, for the listener's memory. */
export type Told = Pick<Story, "placeId" | "factIds" | "contextIds"> & { placeName?: string };

/**
 * One story being told: the voice streams from `audioUrl` while the API still writes the text,
 * which `useLiveText` follows.
 */
export type Clip = { id: string; audioUrl: string; placeId: string; placeName?: string };

/** Sawa may talk until the next stop. */
function targetSecFor(stops: readonly MockStop[], index: number): number {
  const stop = stops[index];
  const next = stops[index + 1];
  const sec = stop && next ? (next.etaMin - stop.etaMin) * 60 : LAST_STOP_SEC;
  return Math.min(MAX_TARGET_SEC, Math.max(MIN_TARGET_SEC, Math.round(sec)));
}

/**
 * A clip depends on who listens and how long Sawa may talk, not only on the stop (T-93):
 * after a change of interests or ride length the old story must not play.
 */
export function clipKey(stopId: string, listener: Listener, targetSec: number): string {
  return JSON.stringify([stopId, targetSec, listener]);
}

/**
 * Starts a story with what Sawa already told this listener, so it tells something new.
 * Answers at once: the voice starts on the first sentence while the rest is still written.
 */
export async function fetchClip(
  placeId: string,
  listener: Listener,
  targetSec: number,
  placeName?: string,
): Promise<Clip> {
  const memory = getMemory();
  const res = await api.v1.stories.live.$post({
    json: {
      placeId,
      targetSec,
      ...listener,
      heardFacts: memory.places[placeId]?.facts ?? [],
      knownContexts: memory.contexts,
    },
  });
  if (!res.ok) throw new Error(`POST /v1/stories/live: ${res.status}`);
  const { id } = await res.json();
  const audioUrl = api.v1.stories.live[":id"].audio.$url({ param: { id } }).toString();
  return { id, audioUrl, placeId, placeName };
}

/** The text of a clip as Sawa writes it; `told` once it is finished. */
export type LiveText = { text: string | null; done: boolean; told: Told | null; failed: boolean };

const NO_TEXT: LiveText = { text: null, done: false, told: null, failed: false };
/** The text grows a sentence or two a second; this keeps the card close behind the voice. */
const POLL_MS = 400;

/** Follows a clip's text (GET /v1/stories/live/:id) until the story is finished. */
export function useLiveText(clip: Clip | null): LiveText {
  const [live, setLive] = useState<LiveText>(NO_TEXT);
  useEffect(() => {
    setLive(NO_TEXT);
    if (!clip) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const res = await api.v1.stories.live[":id"].$get({ param: { id: clip.id } });
        if (!res.ok) throw new Error(`GET /v1/stories/live: ${res.status}`);
        const { text, done, story } = await res.json();
        if (cancelled) return;
        const told = story && {
          placeId: clip.placeId,
          factIds: story.factIds,
          contextIds: story.contextIds,
          placeName: clip.placeName,
        };
        setLive({ text: text || null, done, told, failed: done && !story && !text });
        if (!done) timer = setTimeout(poll, POLL_MS);
      } catch {
        if (!cancelled) setLive((l) => ({ ...l, done: true, failed: !l.text }));
      }
    };
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [clip]);
  return live;
}

/**
 * Progress of a voice that may still be streaming: its length is known only at the end, so
 * until then it is guessed from the words written so far (never 100 before `ended`).
 */
export function audioProgress(audio: HTMLAudioElement, live: LiveText): number {
  if (live.done && Number.isFinite(audio.duration) && audio.duration > 0) {
    return Math.min(100, (audio.currentTime / audio.duration) * 100);
  }
  const words = live.text?.split(/\s+/).length ?? 0;
  if (!words) return 0;
  return Math.min(99, (audio.currentTime / (words / WORDS_PER_SEC)) * 100);
}

/** Remembers a story once it was heard past `HEARD_AT_PROGRESS`, once per clip. */
export function useRememberHeard(clipId: string | undefined, told: Told | null, progress: number) {
  const remembered = useRef(new Set<string>());
  useEffect(() => {
    if (!clipId || !told || progress < HEARD_AT_PROGRESS || remembered.current.has(clipId)) return;
    remembered.current.add(clipId);
    rememberStory(told);
  }, [clipId, told, progress]);
}

/**
 * Plays the active stop's story with Sawa's voice and prefetches the next one.
 * The voice streams while the story is written; progress comes from the audio, and without
 * audio from the text length.
 */
export function useStoryPlayer(
  stops: readonly MockStop[],
  activeIndex: number,
  listener: Listener,
) {
  const cache = useRef(new Map<string, Promise<Clip>>());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [clip, setClip] = useState<Clip | null>(null);
  const [startFailed, setStartFailed] = useState(false);
  const [voiceFailed, setVoiceFailed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const live = useLiveText(clip);
  const failed = startFailed || live.failed;
  const hasVoice = clip !== null && !voiceFailed;
  // Id punktu, który jest teraz aktywny: spóźniona odpowiedź z innego punktu nie może nadpisać klipu.
  const activeId = useRef<string | undefined>(undefined);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    const onEnded = () => setProgress(100);
    // No voice (ElevenLabs down, quota): the card still shows the text and runs on a timer.
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
    setStartFailed(false);
    setProgress(0);
    load(activeIndex)
      ?.then((next) => !cancelled && setClip(next))
      .catch(() => !cancelled && setStartFailed(true));
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
    if (!stop || !clip || !live.told) return;
    rememberStory(live.told);
    cache.current.delete(clipKey(stop.id, listener, targetSecFor(stops, activeIndex)));
    setClip(null);
    setStartFailed(false);
    setProgress(0);
    setIsPlaying(true);
    load(activeIndex)
      ?.then((next) => activeId.current === stop.id && setClip(next))
      .catch(() => activeId.current === stop.id && setStartFailed(true));
  }, [stops, activeIndex, clip, live.told, load, listener]);

  // The next story is written and voiced on the server before the tram gets there.
  useEffect(() => {
    if (live.done) load(activeIndex + 1)?.catch(() => {});
  }, [live.done, activeIndex, load]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setVoiceFailed(false);
    if (!clip) {
      audio.pause();
      audio.removeAttribute("src");
      return;
    }
    audio.src = clip.audioUrl;
  }, [clip]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !hasVoice) return;
    // The browser blocks sound before the first tap; the play button then starts it.
    if (isPlaying) audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  }, [isPlaying, hasVoice]);

  // Progress in animation frames, so the bar moves smoothly
  useEffect(() => {
    if (!isPlaying || (!clip && !failed)) return;
    const audio = audioRef.current;
    // Without the voice the timer waits for the whole text, which says how long to wait.
    if (!hasVoice && !failed && !live.done) return;
    const words = live.text ? live.text.split(/\s+/).length : 0;
    const timerMs = words ? (words / WORDS_PER_SEC) * 1000 : FAILED_STORY_MS;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      if (hasVoice && audio) {
        if (!audio.ended) setProgress(audioProgress(audio, live));
      } else {
        setProgress((current) => Math.min(100, current + (delta / timerMs) * 100));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, clip, failed, hasVoice, live]);

  useRememberHeard(clip?.id, live.told, progress);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    const restart = progress >= 100;
    if (restart) setProgress(0);
    if (!isPlaying && audio && hasVoice) {
      // Called inside the tap, so Safari lets the sound start.
      if (restart) audio.currentTime = 0;
      audio.play().catch(() => setIsPlaying(false));
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, progress, hasVoice]);

  return {
    text: live.text,
    loading: !failed && live.text === null,
    failed,
    isPlaying,
    setIsPlaying,
    progress,
    /** Zeruje postęp w tym samym renderze co zmiana punktu, żeby koniec opowieści nie przeskoczył dwóch. */
    rewind: useCallback(() => setProgress(0), []),
    toggle,
    more,
  };
}

export type StoryPlayer = ReturnType<typeof useStoryPlayer>;
