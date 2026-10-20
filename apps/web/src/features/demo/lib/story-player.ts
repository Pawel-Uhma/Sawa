"use client";

import { MAX_HEARD_PLACES, type Side, type Story } from "@sawa/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Listener } from "./api-data";
import { getMemory, HEARD_AT_PROGRESS, rememberStory } from "./memory";
import type { MockStop } from "./mock-data";
import { etaSecOf } from "./ride-clock";
import { claimVoice, isAside, ROUTE_VOICE, useVoiceOwner } from "./voice";

/**
 * Sawa's voice reads about 17 characters a second (measured with whisper on three stories, 17.10).
 * Characters follow the voice closer than words: long words take longer to say.
 */
const CHARS_PER_SEC = 17.2;
/** The highlight runs this far ahead, so a word lights up as Sawa starts it, not after it. */
const LEAD_CHARS = 3;
/** Without a next stop Sawa gets a medium story. */
const LAST_STOP_SEC = 75;
const MIN_TARGET_SEC = 20;
const MAX_TARGET_SEC = 600;
/** Sawa stays quiet at a dull place: the card says so this long, then the topic ends. */
const SILENT_MS = 1500;
const SILENT_TEXT = "Tu jedziemy dalej.";
/** When even the story text fails, the card waits this long and moves on. */
const FAILED_STORY_MS = 6000;
/** Przerwany temat cichnie zamiast urywać się w pół słowa. */
const FADE_OUT_MS = 350;
/** Nowy temat wchodzi łagodnie. */
const FADE_IN_MS = 500;
/** Oddech Sawy między tematami, gdy poprzedni skończył się sam. */
const BREATH_MS = 600;
/** Przerwany temat cichnie, a nowy już wchodzi: nakładka zamiast ciszy i twardego cięcia. */
export const CROSSFADE_MS = 1000;
/** Po pauzie elementu tyle czekamy, zanim uznamy, że zatrzymał go ktoś z zewnątrz. */
const PAUSE_CHECK_MS = 300;
/** Pauza tak blisko końca głosu to koniec opowieści, a nie przerwanie. */
const END_SLACK_SEC = 0.3;

/** Krok płynnej zmiany głośności (ok. 60 razy na sekundę). */
const FADE_STEP_MS = 16;

/**
 * Ile przejścia głośności już minęło (0–1). Przy ukrytej stronie (zgaszony ekran, telefon
 * w kieszeni) od razu koniec: przeglądarka wtedy rzadko budzi timery, a głos ma grać od razu.
 */
export function fadeAt(elapsedMs: number, ms: number, hidden: boolean): number {
  if (hidden || ms <= 0) return 1;
  return Math.min(1, Math.max(0, elapsedMs / ms));
}

/** Bieżące przejście głośności każdego elementu: nowe przerywa poprzednie. */
const fadeTokens = new WeakMap<HTMLAudioElement, number>();

/** Przerywa przejście głośności elementu (np. przed `volume = 1` w geście stuknięcia). */
function stopFade(audio: HTMLAudioElement): number {
  const id = (fadeTokens.get(audio) ?? 0) + 1;
  fadeTokens.set(audio, id);
  return id;
}

/**
 * Czy da się zmienić głośność elementu. Na iOS `volume` jest tylko do odczytu: tam nie ma
 * nakładki dwóch głosów (grałyby naraz pełnym głosem), tylko zmiana tematu.
 */
function canSetVolume(audio: HTMLAudioElement): boolean {
  const before = audio.volume;
  audio.volume = before === 1 ? 0.5 : 1;
  const can = audio.volume !== before;
  audio.volume = before;
  return can;
}

/**
 * Jak przejść od głosu, który jest w elemencie, do następnego klipu:
 * - `start`: nic nie gra, nowy temat wchodzi od razu,
 * - `breath`: poprzedni skończył się sam, Sawa bierze oddech i zaczyna,
 * - `crossfade`: przerwany temat cichnie, a nowy już wchodzi (ok. 1 s nakładki),
 * - `cut`: przerwany temat staje od razu (iOS, gdzie głośności nie da się zmienić),
 * - `fade-out`: następny klip jest bez głosu, poprzedni tylko cichnie.
 */
export function voiceTransition({
  hasSound,
  paused,
  ended,
  nextHasVoice,
  canFade,
}: {
  hasSound: boolean;
  paused: boolean;
  ended: boolean;
  nextHasVoice: boolean;
  canFade: boolean;
}): "start" | "breath" | "crossfade" | "cut" | "fade-out" {
  const sounding = hasSound && !paused && !ended;
  if (!nextHasVoice) return sounding ? "fade-out" : "start";
  if (hasSound && ended) return "breath";
  if (!sounding) return "start";
  return canFade ? "crossfade" : "cut";
}

/**
 * Płynnie zmienia głośność. Na iOS `volume` jest tylko do odczytu, więc tam zostaje
 * sama pauza o tej długości, bez wyciszenia. Nowe przejście przerywa poprzednie (`stopFade`).
 * Na timerze, nie na klatkach animacji: przy zgaszonym ekranie klatki stają i głos zostawał
 * wyciszony na całą opowieść, a następny temat nie wchodził wcale.
 */
function fadeVolume(audio: HTMLAudioElement, to: number, ms: number): Promise<void> {
  const id = stopFade(audio);
  const from = audio.volume;
  const startedAt = performance.now();
  return new Promise((resolve) => {
    const step = () => {
      if (fadeTokens.get(audio) !== id) return resolve();
      const t = fadeAt(performance.now() - startedAt, ms, document.hidden);
      audio.volume = from + (to - from) * t;
      if (t < 1) setTimeout(step, FADE_STEP_MS);
      else resolve();
    };
    setTimeout(step, FADE_STEP_MS);
  });
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Czy odrzucone `play()` znaczy, że głos nie gra (przeglądarka go zablokowała albo nie umie
 * odtworzyć), więc odtwarzacz ma stanąć. `AbortError` to nasze przerwanie: `pause()` albo nowy
 * klip w trakcie wczytywania. Wtedy nie pauzujemy, bo np. wybór kolejnego miejsca zatrzymywał Sawę.
 */
export function playFailed(error: unknown): boolean {
  return (error as { name?: unknown } | null)?.name !== "AbortError";
}

/**
 * Czy głos zatrzymał ktoś spoza odtwarzacza (ekran blokady, odłączone słuchawki, połączenie,
 * system iOS): Sawa miała mówić, klip jest wczytany, a element stoi przed końcem. Wtedy
 * odtwarzacz też staje, żeby przycisk, zegar jazdy i muzyka nie myślały, że Sawa mówi.
 */
export function pausedFromOutside(state: {
  speaking: boolean;
  loaded: boolean;
  paused: boolean;
  ended: boolean;
}): boolean {
  return state.speaking && state.loaded && state.paused && !state.ended;
}

/** Czy element gra właśnie ten klip (a nie poprzedni, który jeszcze cichnie). */
function isLoaded(audio: HTMLAudioElement, clip: Clip | null): boolean {
  return Boolean(clip?.audioUrl) && audio.getAttribute("src") === clip?.audioUrl;
}

/** Głos, który już nic nie mówi: stoi i nie trzyma strumienia. */
function retire(audio: HTMLAudioElement) {
  stopFade(audio);
  audio.pause();
  audio.removeAttribute("src");
}

/**
 * Zdarzenia jednego głosu. Pauzę sprawdzamy chwilę po zdarzeniu (`onPaused`): nasze pauzy mają
 * już wtedy `speaking: false`, koniec opowieści ma `ended`, a nowy klip zdążył ruszyć.
 * Zostaje pauza z zewnątrz.
 */
function watchVoice(
  audio: HTMLAudioElement,
  on: { onEnded: () => void; onError: () => void; onPaused: () => void; onPlaying: () => void },
): () => void {
  let pauseCheck: ReturnType<typeof setTimeout> | undefined;
  const onPause = () => {
    clearTimeout(pauseCheck);
    pauseCheck = setTimeout(on.onPaused, PAUSE_CHECK_MS);
  };
  audio.addEventListener("ended", on.onEnded);
  audio.addEventListener("error", on.onError);
  audio.addEventListener("pause", onPause);
  audio.addEventListener("playing", on.onPlaying);
  return () => {
    clearTimeout(pauseCheck);
    audio.removeEventListener("ended", on.onEnded);
    audio.removeEventListener("error", on.onError);
    audio.removeEventListener("pause", onPause);
    audio.removeEventListener("playing", on.onPlaying);
  };
}

/**
 * What a story told, for the listener's memory. `suggestion`: nothing new was left here, Sawa
 * offers the place next door instead.
 */
export type Told = Pick<Story, "placeId" | "factIds" | "contextIds" | "suggestion"> & {
  placeName?: string;
};

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
  /** Nothing worth telling here (`Story.silent`): no voice, the topic ends at once. */
  silent?: boolean;
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
 * The voice (ElevenLabs) is on by default. `?voice=0` in the URL turns it off: the story text
 * still shows and runs on a timer.
 */
export function voiceOn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("voice") !== "0";
  } catch {
    return true;
  }
}

/**
 * Tło znane słuchaczowi: z pamięci i z opowieści, które już padły na tej trasie, choć jeszcze
 * ich nie zapamiętano (następną opowieść pobieramy, zanim słuchacz dosłucha bieżącej).
 */
export function knownContextsWith(
  remembered: readonly string[],
  toldOnRoute: Iterable<string>,
): string[] {
  return [...new Set([...remembered, ...toldOnRoute])];
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
  side?: Side,
  /** „Więcej o tym miejscu”: gdy nic nowego nie zostało, Sawa poleca miejsce obok. */
  {
    more = false,
    toldContexts = [],
    previousPlaceName,
  }: {
    more?: boolean;
    toldContexts?: Iterable<string>;
    /** Miejsce, o którym Sawa mówiła tuż przed tym: zaczyna zdaniem-pomostem od niego. */
    previousPlaceName?: string;
  } = {},
): Promise<Clip> {
  const memory = getMemory();
  const heardAt = memory.places[placeId]?.at;
  const json = {
    placeId,
    targetSec,
    side,
    ...listener,
    heardFacts: memory.places[placeId]?.facts ?? [],
    knownContexts: knownContextsWith(memory.contexts, toldContexts),
    // Sawa mówi „tydzień temu opowiadałam ci…”, a nie „pamiętasz…”.
    heardAgoSec:
      heardAt === undefined ? undefined : Math.max(0, Math.floor((Date.now() - heardAt) / 1000)),
    ...(more && { more, heardPlaceIds: Object.keys(memory.places).slice(-MAX_HEARD_PLACES) }),
    // „Więcej” zostaje przy tym miejscu, więc bez pomostu.
    ...(!more && previousPlaceName && { previousPlaceName }),
  };
  if (!voiceOn()) {
    const res = await api.v1.stories.$post({ json });
    if (!res.ok) throw new Error(`POST /v1/stories: ${res.status}`);
    const { text, factIds, contextIds, suggestion, silent } = await res.json();
    const told = { placeId, factIds, contextIds, suggestion, placeName };
    const id = `${placeId}:${Date.now()}`;
    return { id, audioUrl: null, placeId, placeName, text, told, silent };
  }
  const res = await api.v1.stories.live.$post({ json });
  if (!res.ok) throw new Error(`POST /v1/stories/live: ${res.status}`);
  const { id } = await res.json();
  const audioUrl = api.v1.stories.live[":id"].audio.$url({ param: { id } }).toString();
  return { id, audioUrl, placeId, placeName };
}

/** The text of a clip as Sawa writes it; `told` once it is finished. */
export type LiveText = {
  text: string | null;
  done: boolean;
  told: Told | null;
  failed: boolean;
  /** Sawa has nothing worth telling here and stays quiet (`Story.silent`). */
  silent?: boolean;
  /** When each word starts in the voice (seconds), as far as the voice is made; API may not know. */
  wordTimes?: number[];
};

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
      const { text, told, silent } = clip;
      setLive({ text, done: true, told: told ?? null, failed: !text, silent });
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const res = await api.v1.stories.live[":id"].$get({ param: { id: clip.id } });
        if (!res.ok) throw new Error(`GET /v1/stories/live: ${res.status}`);
        const { text, done, story, wordTimes } = await res.json();
        if (cancelled) return;
        const told = story && {
          placeId: clip.placeId,
          factIds: story.factIds,
          contextIds: story.contextIds,
          suggestion: story.suggestion,
          placeName: clip.placeName,
        };
        const silent = story?.silent;
        setLive({
          text: text || null,
          done,
          told,
          failed: done && !story && !text,
          silent,
          wordTimes,
        });
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
  const chars = live.text?.length ?? 0;
  if (!chars) return 0;
  const guess = chars / CHARS_PER_SEC;
  // Pobrany kawałek głosu nie jest dłuższy niż całość, więc przy gotowym tekście ogranicza zgadywanie.
  const total = live.done ? Math.max(guess, bufferedEnd(audio)) : guess;
  return Math.min(99, (audio.currentTime / total) * 100);
}

function bufferedEnd(audio: HTMLAudioElement): number {
  const { buffered } = audio;
  return buffered.length ? buffered.end(buffered.length - 1) : 0;
}

/** O tyle sekund przewijają przyciski ±15 s. */
export const SKIP_SEC = 15;
/** Głos jeszcze się robi: „do przodu” staje tyle przed końcem pobranego kawałka, żeby nie zaciąć. */
const STREAM_SLACK_SEC = 1;

/**
 * Dokąd przewinąć głos o `deltaSec`. Póki opowieść się pisze (`done: false`), strumień nie
 * odpowiada na zakresy bajtów, więc do przodu tylko w obrębie pobranego kawałka. Gotowa opowieść
 * przewija się do końca (`duration`), co kończy temat jak „Następne”.
 */
export function seekTarget(
  at: number,
  deltaSec: number,
  { done, duration, buffered }: { done: boolean; duration: number; buffered: number },
): number {
  const end =
    done && Number.isFinite(duration) && duration > 0
      ? duration
      : Math.max(at, buffered - STREAM_SLACK_SEC);
  return Math.min(end, Math.max(0, at + deltaSec));
}

/** How long Sawa takes to read a text, for the timer when there is no voice. */
export function speakingMs(text: string | null): number {
  return text ? (text.length / CHARS_PER_SEC) * 1000 : 0;
}

/**
 * Where the spoken part of `text` ends at `progress` (0–100): the end of the word Sawa is saying
 * now, so the highlight shows the current word, not the last finished one.
 */
export function spokenLength(text: string, progress: number): number {
  if (progress <= 0) return 0;
  const at = Math.floor((progress / 100) * text.length) + LEAD_CHARS;
  if (at >= text.length) return text.length;
  const rest = text.slice(at).search(/\s/);
  return rest < 0 ? text.length : at + rest;
}

/** The highlight runs this far ahead of the voice, so a word lights up as Sawa starts it. */
const LEAD_SEC = 0.05;

/**
 * How many words of `text` Sawa has started saying. With the voice's word times (from the API)
 * it is the last word whose start has passed; without them, or past their end, the guess from
 * `progress` (characters per second), as in the timer without the voice.
 */
export function spokenWordCount(
  text: string | null,
  progress: number,
  wordTimes: readonly number[] | undefined,
  voiceSec: number | null,
): number {
  if (!text) return 0;
  const guess = text.slice(0, spokenLength(text, progress)).split(/\s+/).length;
  if (!wordTimes?.length || voiceSec === null) return guess;
  const words = text.split(/\s+/).length;
  let n = 0;
  while (n < wordTimes.length && (wordTimes[n] as number) <= voiceSec + LEAD_SEC) n++;
  // Times known past this moment: the voice is on word `n`.
  if (n < wordTimes.length || wordTimes.length >= words) return Math.min(n, words);
  return Math.min(words, Math.max(n, guess));
}

/** Where the first `words` words of `text` end, for cutting it into said and still to say. */
export function spokenCut(text: string, words: number): number {
  if (words <= 0) return 0;
  const word = /\S+/g;
  let end = 0;
  for (let i = 0; i < words; i++) {
    const m = word.exec(text);
    if (!m) return text.length;
    end = m.index + m[0].length;
  }
  return end;
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
  // Dygresja (opowieść z karty miejsca) ucisza trasę, ale nie zmienia zamiaru słuchania:
  // po jej końcu trasa wraca sama.
  const aside = isAside(useVoiceOwner());
  const speaking = isPlaying && !aside;
  const [progress, setProgress] = useState(0);
  // Where the voice of this clip is (seconds); another clip's position does not count.
  const [voiceAt, setVoiceAt] = useState<{ clipId: string; sec: number } | null>(null);
  const live = useLiveText(clip);
  // Tło wyjaśnione na tej trasie: następna opowieść nie tłumaczy go drugi raz.
  // Efekt stoi przed pobieraniem następnej opowieści, więc ta już widzi nowe tło.
  const toldContexts = useRef(new Set<string>());
  useEffect(() => {
    for (const id of live.told?.contextIds ?? []) toldContexts.current.add(id);
  }, [live.told]);
  const failed = startFailed || live.failed;
  const hasVoice = Boolean(clip?.audioUrl) && !voiceFailed;
  // Id punktu, który jest teraz aktywny: spóźniona odpowiedź z innego punktu nie może nadpisać klipu.
  const activeId = useRef<string | undefined>(undefined);
  // Efekty audio czytają bieżący stan bez ponownego uruchamiania przejścia.
  const clipRef = useRef<Clip | null>(null);
  clipRef.current = clip;
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;
  // Dwa głosy na zmianę: przerwany temat cichnie w jednym, a nowy już wchodzi w drugim.
  // `audioRef` to zawsze ten z bieżącym tematem.
  const voices = useRef<HTMLAudioElement[]>([]);
  // Na iOS głośność jest tylko do odczytu: tam bez nakładki (`voiceTransition`).
  const canFade = useRef(true);

  useEffect(() => {
    const pair = [new Audio(), new Audio()];
    voices.current = pair;
    audioRef.current = pair[0] ?? null;
    canFade.current = pair[0] ? canSetVolume(pair[0]) : false;
    // iOS pozwala elementowi grać bez stuknięcia dopiero, gdy raz ruszył w stuknięciu. Pierwsza
    // opowieść rusza z zegarem jazdy, poza stuknięciem, więc głosy odblokowujemy przy pierwszym
    // dotknięciu strony, póki element nie ma jeszcze klipu (wtedy nic nie zagra).
    const gestures = ["touchend", "click"] as const;
    const unlocked = new Set<HTMLAudioElement>();
    const stopUnlocking = () => {
      for (const type of gestures) window.removeEventListener(type, unlock, { capture: true });
    };
    // Głos, który już raz zagrał, jest odblokowany.
    const markUnlocked = (audio: HTMLAudioElement) => {
      unlocked.add(audio);
      if (unlocked.size === pair.length) stopUnlocking();
    };
    const unlock = () => {
      for (const audio of pair) {
        if (unlocked.has(audio) || audio.getAttribute("src")) continue;
        audio.play().catch(() => {});
        audio.pause();
        markUnlocked(audio);
      }
    };
    for (const type of gestures) {
      window.addEventListener(type, unlock, { capture: true, passive: true });
    }
    const unwatch = pair.map((audio) =>
      watchVoice(audio, {
        // Koniec starego klipu, który jeszcze cichł, nie kończy nowego tematu.
        onEnded: () => isLoaded(audio, clipRef.current) && setProgress(100),
        // No voice (ElevenLabs down, quota): the card still shows the text and runs on a timer.
        onError: () =>
          audio === audioRef.current && audio.getAttribute("src") && setVoiceFailed(true),
        onPaused: () => {
          const state = {
            speaking: speakingRef.current,
            loaded: isLoaded(audio, clipRef.current),
            paused: audio.paused,
            ended: audio.ended || audio.currentTime >= audio.duration - END_SLACK_SEC,
          };
          if (pausedFromOutside(state)) setIsPlaying(false);
        },
        onPlaying: () => markUnlocked(audio),
      }),
    );
    return () => {
      stopUnlocking();
      for (const stop of unwatch) stop();
      for (const audio of pair) retire(audio);
    };
  }, []);

  // Miejsce ostatniej opowieści na tej trasie: od niego Sawa przechodzi do następnego.
  const lastTold = useRef<{ stops: readonly MockStop[]; placeId: string; name?: string } | null>(
    null,
  );
  useEffect(() => {
    if (clip) lastTold.current = { stops, placeId: clip.placeId, name: clip.placeName };
  }, [clip, stops]);

  const load = useCallback(
    (index: number, more = false) => {
      const stop = stops[index];
      if (!stop) return null;
      const targetSec = targetSecFor(stops, index);
      const key = clipKey(stop.id, listener, targetSec);
      let pending = cache.current.get(key);
      if (!pending) {
        // Pobierana z wyprzedzeniem następna opowieść idzie po bieżącej; wybrana ręcznie po tej,
        // która grała ostatnio (na tej trasie). Pierwsza opowieść jazdy zaczyna bez pomostu.
        const last = lastTold.current;
        const previous =
          last && last.stops === stops && last.placeId !== stop.id ? last.name : undefined;
        pending = fetchClip(stop.id, listener, targetSec, stop.name, stop.side, {
          more,
          toldContexts: toldContexts.current,
          previousPlaceName: previous,
        });
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
   * Pamięć idzie do zapytania, więc Sawa nie powtórzy faktów. Gdy nic nowego nie zostało, Sawa
   * mówi to i poleca miejsce obok (`suggestion`).
   */
  const more = useCallback(() => {
    const stop = stops[activeIndex];
    if (!stop || !clip || !live.told) return;
    rememberStory(live.told);
    claimVoice(ROUTE_VOICE);
    cache.current.delete(clipKey(stop.id, listener, targetSecFor(stops, activeIndex)));
    setClip(null);
    setStartFailed(false);
    setProgress(0);
    setIsPlaying(true);
    load(activeIndex, true)
      ?.then((next) => activeId.current === stop.id && setClip(next))
      .catch(() => activeId.current === stop.id && setStartFailed(true));
  }, [stops, activeIndex, clip, live.told, load, listener]);

  // The next story is written and voiced on the server before the tram gets there.
  useEffect(() => {
    if (live.done) load(activeIndex + 1)?.catch(() => {});
  }, [live.done, activeIndex, load]);

  // Zmiana tematu (`voiceTransition`): przerwany temat cichnie, a nowy wchodzi w drugim głosie
  // (nakładka ok. 1 s); po końcu opowieści Sawa bierze oddech. Póki następny klip się wczytuje
  // (`clip` null), bieżący tylko cichnie, a gdy klip przyjdzie w trakcie, nakładka trwa dalej.
  useEffect(() => {
    const outgoing = audioRef.current;
    if (!outgoing || isLoaded(outgoing, clip)) return;
    setVoiceFailed(false);
    let cancelled = false;
    const url = clip?.audioUrl;
    const kind = voiceTransition({
      hasSound: Boolean(outgoing.getAttribute("src")),
      paused: outgoing.paused,
      ended: outgoing.ended,
      nextHasVoice: Boolean(url),
      canFade: canFade.current,
    });
    // Głos, który ucichł, kończy się, chyba że w międzyczasie znowu mówi bieżący temat.
    const fadeOut = () =>
      fadeVolume(outgoing, 0, CROSSFADE_MS).then(
        () => outgoing !== audioRef.current && retire(outgoing),
      );
    if (!url) {
      if (kind === "fade-out" && canFade.current) {
        audioRef.current = voices.current.find((v) => v !== outgoing) ?? outgoing;
        fadeOut();
      } else if (!outgoing.ended) retire(outgoing);
      return () => {
        cancelled = true;
      };
    }
    if (kind === "cut") retire(outgoing);
    if (kind === "crossfade") fadeOut();
    const incoming =
      kind === "crossfade" ? (voices.current.find((v) => v !== outgoing) ?? outgoing) : outgoing;
    audioRef.current = incoming;
    // Poprzedni temat jeszcze cichnie (także od chwili, gdy ten klip się wczytywał): nowy wchodzi
    // równo z nim, w czasie nakładki.
    const fadeInMs = voices.current.some(
      (v) => v !== incoming && v.getAttribute("src") && !v.paused && !v.ended,
    )
      ? CROSSFADE_MS
      : FADE_IN_MS;
    const before = kind === "breath" ? wait(BREATH_MS) : Promise.resolve();
    before.then(() => {
      if (cancelled) return;
      stopFade(incoming);
      incoming.volume = 0;
      incoming.src = url;
      if (!speakingRef.current) {
        incoming.volume = 1;
        return;
      }
      incoming
        .play()
        .then(() => {
          if (!cancelled) return fadeVolume(incoming, 1, fadeInMs);
        })
        .catch((error) => {
          incoming.volume = 1;
          if (playFailed(error)) setIsPlaying(false);
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
    // Wybór innego miejsca (Następne, Wstecz, punkt z listy) włącza odtwarzanie w tym samym
    // renderze, w którym jeszcze jest stary klip. Nie wznawiamy go: zakończony zagrałby od
    // początku, zanim przejście go wyciszy. Nowy temat startuje efekt przejścia.
    if (speaking && clip?.placeId !== activeId.current) return;
    if (!speaking) {
      // Temat, który jeszcze cichł po zmianie, też milknie: pauza to cisza Sawy.
      for (const other of voices.current) {
        if (other !== audio && other.getAttribute("src")) retire(other);
      }
      // Dygresja wchodzi na wyciszaną trasę, pauza użytkownika zatrzymuje od razu.
      if (!aside || audio.paused) audio.pause();
      else fadeVolume(audio, 0, FADE_OUT_MS).then(() => !speakingRef.current && audio.pause());
      return;
    }
    // The browser blocks sound before the first tap; the play button then starts it.
    // Po dygresji trasa wraca łagodnie, tam gdzie przerwała.
    const fadeIn = audio.volume < 1;
    audio
      .play()
      .then(() => {
        if (fadeIn) return fadeVolume(audio, 1, FADE_IN_MS);
      })
      .catch((error) => playFailed(error) && setIsPlaying(false));
  }, [speaking, aside, hasVoice, clip]);

  // Nic ciekawego w tym miejscu: Sawa milczy, temat kończy się po krótkiej pauzie.
  useEffect(() => {
    if (!speaking || !live.silent) return;
    const timer = setTimeout(() => setProgress(100), SILENT_MS);
    return () => clearTimeout(timer);
  }, [speaking, live.silent]);

  // Progress in animation frames, so the bar moves smoothly
  useEffect(() => {
    if (!speaking || (!clip && !failed) || live.silent) return;
    const audio = audioRef.current;
    // Without the voice the timer waits for the whole text, which says how long to wait.
    if (!hasVoice && !failed && !live.done) return;
    const timerMs = speakingMs(live.text) || FAILED_STORY_MS;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      if (hasVoice && audio) {
        // Cichnący poprzedni klip nie przesuwa paska nowego tematu.
        if (isLoaded(audio, clip) && !audio.ended) {
          setProgress(audioProgress(audio, live));
          if (clip) setVoiceAt({ clipId: clip.id, sec: audio.currentTime });
        }
      } else {
        setProgress((current) => Math.min(100, current + (delta / timerMs) * 100));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [speaking, clip, failed, hasVoice, live]);

  useRememberHeard(clip?.id, live.told, progress);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    const restart = progress >= 100;
    if (restart) setProgress(0);
    // W trakcie dygresji odtwarzanie znaczy „wróć do trasy”: dygresja cichnie, trasa gra dalej.
    if (aside) {
      claimVoice(ROUTE_VOICE);
      if (audio && hasVoice && isLoaded(audio, clip)) {
        stopFade(audio);
        audio.volume = 1;
        if (restart) audio.currentTime = 0;
        audio.play().catch((error) => playFailed(error) && setIsPlaying(false));
      }
      setIsPlaying(true);
      return;
    }
    if (!isPlaying && audio && hasVoice && isLoaded(audio, clip)) {
      stopFade(audio);
      audio.volume = 1;
      // Called inside the tap, so Safari lets the sound start.
      if (restart) audio.currentTime = 0;
      audio.play().catch((error) => playFailed(error) && setIsPlaying(false));
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, aside, progress, hasVoice, clip]);

  /** Bieżąca opowieść od początku; `keepPlaying: false` to „stop” (pauza na początku). */
  const restart = useCallback(
    (keepPlaying: boolean) => {
      const audio = audioRef.current;
      setProgress(0);
      if (keepPlaying) claimVoice(ROUTE_VOICE);
      if (audio && isLoaded(audio, clip)) {
        stopFade(audio);
        audio.volume = 1;
        audio.currentTime = 0;
        // W geście stuknięcia, żeby Safari pozwolił na dźwięk.
        if (keepPlaying) audio.play().catch((error) => playFailed(error) && setIsPlaying(false));
      }
      setIsPlaying(keepPlaying);
    },
    [clip],
  );

  /**
   * ±`SKIP_SEC` w bieżącej opowieści. Z głosem przesuwa element, bez niego zegar tekstu.
   * Do przodu za koniec kończy temat; wstecz po końcu opowieści wraca do niej i gra dalej.
   */
  const skip = useCallback(
    (deltaSec: number) => {
      if (aside || live.silent || (!live.text && !failed)) return;
      const audio = audioRef.current;
      if (hasVoice && audio && clip && isLoaded(audio, clip)) {
        const at = seekTarget(audio.currentTime, deltaSec, {
          done: live.done,
          duration: audio.duration,
          buffered: bufferedEnd(audio),
        });
        audio.currentTime = at;
        const ended = live.done && at >= audio.duration;
        // Pętla klatek stoi w pauzie, więc pasek i podświetlenie ustawiamy od razu.
        setProgress(ended ? 100 : audioProgress(audio, live));
        setVoiceAt({ clipId: clip.id, sec: at });
        // Głos, który już dobiegł końca, stoi; w geście stuknięcia ruszamy go znowu.
        if (!ended && speaking && audio.paused) {
          stopFade(audio);
          audio.volume = 1;
          audio.play().catch((error) => playFailed(error) && setIsPlaying(false));
        }
        return;
      }
      if (!hasVoice && !failed && !live.done) return;
      const timerMs = speakingMs(live.text) || FAILED_STORY_MS;
      setProgress((p) => Math.min(100, Math.max(0, p + ((deltaSec * 1000) / timerMs) * 100)));
    },
    [aside, live, failed, hasVoice, clip, speaking],
  );

  const voiceSec = hasVoice && clip && voiceAt?.clipId === clip.id ? voiceAt.sec : null;

  return {
    text: live.silent ? SILENT_TEXT : live.text,
    /** Ile słów tekstu Sawa już zaczęła mówić (podświetlenie): z czasów głosu, bez nich zgadywane. */
    spokenWords: live.silent
      ? spokenWordCount(SILENT_TEXT, progress, undefined, null)
      : spokenWordCount(live.text, progress, live.wordTimes, voiceSec),
    loading: !failed && live.text === null,
    failed,
    /** Czy Sawa mówi teraz o trasie; w trakcie dygresji `false`, choć trasa wróci sama. */
    isPlaying: speaking,
    setIsPlaying,
    progress,
    /** Zeruje postęp w tym samym renderze co zmiana punktu, żeby koniec opowieści nie przeskoczył dwóch. */
    rewind: useCallback(() => setProgress(0), []),
    toggle,
    restart,
    skip,
    /** Czy ±15 s ma co przewijać: opowieść jest i Sawa nie milczy. */
    canSkip: !aside && !live.silent && live.text !== null,
    more,
    /** Po „Więcej”, gdy o tym miejscu nic nowego nie zostało: miejsce obok, o którym Sawa opowie. */
    suggestion: live.told?.suggestion ?? null,
  };
}

export type StoryPlayer = ReturnType<typeof useStoryPlayer>;
