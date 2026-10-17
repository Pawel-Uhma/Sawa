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
/** Przerwany temat cichnie zamiast urywać się w pół słowa. */
const FADE_OUT_MS = 350;
/** Nowy temat wchodzi łagodnie. */
const FADE_IN_MS = 500;
/** Oddech Sawy między tematami, gdy poprzedni skończył się sam. */
const BREATH_MS = 600;

/**
 * Płynnie zmienia głośność. Na iOS `volume` jest tylko do odczytu, więc tam zostaje
 * sama pauza o tej długości, bez wyciszenia. Nowe przejście przerywa poprzednie (`token`).
 */
function fadeVolume(
  audio: HTMLAudioElement,
  to: number,
  ms: number,
  token: { current: number },
): Promise<void> {
  const id = ++token.current;
  const from = audio.volume;
  const startedAt = performance.now();
  return new Promise((resolve) => {
    const tick = (now: number) => {
      if (token.current !== id) return resolve();
      const t = Math.min(1, (now - startedAt) / ms);
      audio.volume = from + (to - from) * t;
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Czy element gra właśnie ten klip (a nie poprzedni, który jeszcze cichnie). */
function isLoaded(audio: HTMLAudioElement, clip: Clip | null): boolean {
  return Boolean(clip?.audioUrl) && audio.getAttribute("src") === clip?.audioUrl;
}

/** What a story told, for the listener's memory. */
export type Told = Pick<Story, "placeId" | "factIds" | "contextIds"> & { placeName?: string };

/**
 * One story being told: the voice streams from `audioUrl` while the API still writes the text,
 * which `useLiveText` follows. Without the voice the story comes whole (`text`, `told`).
 */
export type Clip = {
  id: string;
  audioUrl: string | null;
  placeId: string;
  placeName?: string;
  text?: string;
  told?: Told;
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

/**
 * The voice (ElevenLabs) is off by default because it burns credits. `?voice=1` in the URL turns it on.
 * Without it the story text still shows and runs on a timer.
 */
export function voiceOn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("voice") === "1";
  } catch {
    return false;
  }
}

/**
 * Starts a story with what Sawa already told this listener, so it tells something new.
 * With the voice it answers at once: the voice starts on the first sentence while the rest is
 * still written. Without it the whole text comes in one answer, and no credits are spent.
 */
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
  if (!voiceOn()) {
    const res = await api.v1.stories.$post({ json });
    if (!res.ok) throw new Error(`POST /v1/stories: ${res.status}`);
    const { text, factIds, contextIds } = await res.json();
    const told = { placeId, factIds, contextIds, placeName };
    return { id: `${placeId}:${Date.now()}`, audioUrl: null, placeId, placeName, text, told };
  }
  const res = await api.v1.stories.live.$post({ json });
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
    if (clip.text !== undefined) {
      setLive({ text: clip.text, done: true, told: clip.told ?? null, failed: !clip.text });
      return;
    }
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
  const hasVoice = Boolean(clip?.audioUrl) && !voiceFailed;
  // Id punktu, który jest teraz aktywny: spóźniona odpowiedź z innego punktu nie może nadpisać klipu.
  const activeId = useRef<string | undefined>(undefined);
  // Efekty audio czytają bieżący stan bez ponownego uruchamiania przejścia.
  const clipRef = useRef<Clip | null>(null);
  clipRef.current = clip;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const fadeToken = useRef(0);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    // Koniec starego klipu, który jeszcze cichł, nie kończy nowego tematu.
    const onEnded = () => isLoaded(audio, clipRef.current) && setProgress(100);
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

  // Zmiana tematu: stary klip cichnie (albo Sawa bierze oddech po jego końcu), nowy wchodzi łagodnie.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || isLoaded(audio, clip)) return;
    setVoiceFailed(false);
    let cancelled = false;
    const hasSound = Boolean(audio.getAttribute("src"));
    const before = !hasSound
      ? Promise.resolve()
      : audio.ended
        ? wait(BREATH_MS)
        : audio.paused
          ? Promise.resolve()
          : fadeVolume(audio, 0, FADE_OUT_MS, fadeToken);
    before.then(() => {
      if (cancelled) return;
      if (!clip?.audioUrl) {
        audio.pause();
        audio.removeAttribute("src");
        return;
      }
      fadeToken.current++;
      audio.volume = 0;
      audio.src = clip.audioUrl;
      if (!isPlayingRef.current) {
        audio.volume = 1;
        return;
      }
      audio
        .play()
        .then(() => {
          if (!cancelled) return fadeVolume(audio, 1, FADE_IN_MS, fadeToken);
        })
        .catch(() => {
          audio.volume = 1;
          setIsPlaying(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [clip]);

  useEffect(() => {
    const audio = audioRef.current;
    // Przed wczytaniem klipu gra nim efekt przejścia wyżej.
    if (!audio || !hasVoice || !isLoaded(audio, clip)) return;
    // The browser blocks sound before the first tap; the play button then starts it.
    if (isPlaying) audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  }, [isPlaying, hasVoice, clip]);

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
        // Cichnący poprzedni klip nie przesuwa paska nowego tematu.
        if (isLoaded(audio, clip) && !audio.ended) setProgress(audioProgress(audio, live));
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
    if (!isPlaying && audio && hasVoice && isLoaded(audio, clip)) {
      fadeToken.current++;
      audio.volume = 1;
      // Called inside the tap, so Safari lets the sound start.
      if (restart) audio.currentTime = 0;
      audio.play().catch(() => setIsPlaying(false));
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, progress, hasVoice, clip]);

  /** Bieżąca opowieść od początku; `keepPlaying: false` to „stop” (pauza na początku). */
  const restart = useCallback(
    (keepPlaying: boolean) => {
      const audio = audioRef.current;
      setProgress(0);
      if (audio && isLoaded(audio, clip)) {
        fadeToken.current++;
        audio.volume = 1;
        audio.currentTime = 0;
        // W geście stuknięcia, żeby Safari pozwolił na dźwięk.
        if (keepPlaying) audio.play().catch(() => setIsPlaying(false));
      }
      setIsPlaying(keepPlaying);
    },
    [clip],
  );

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
    restart,
    more,
  };
}

export type StoryPlayer = ReturnType<typeof useStoryPlayer>;
