"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  MUSIC_STORAGE_KEY,
  type MusicEvent,
  parseMusicPreference,
  shouldSwitchTrack,
  type Track,
  trackAt,
} from "./ride-music";

/** Cała muzyka względem głosu Sawy (ten gra na pełnej głośności): tło, nie drugi plan. */
const MUSIC_GAIN = 0.32;
/** Ile muzyki zostaje, gdy Sawa mówi. */
const DUCKED_GAIN = 0.2;
// Przyciszenie szybkie, powrót wolniejszy i z zapasem, żeby muzyka nie skakała między zdaniami
const DUCK_TIME_CONSTANT_SEC = 0.12;
const RELEASE_HOLD_SEC = 0.8;
const RELEASE_TIME_CONSTANT_SEC = 0.6;
const FADE_SEC = 1.2;
const REVERB_SEC = 2.5;
/** Nuty planujemy z wyprzedzeniem: timer przeglądarki się spóźnia, zegar audio nie. */
const LOOKAHEAD_SEC = 1.2;
const SCHEDULE_EVERY_MS = 100;
const SWITCH_CHECK_MS = 500;

type Session = { duck: GainNode; stop: () => void };
type Playing = { startedAt: number; stop: () => void };

let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function audioContext(): AudioContext {
  if (!context) {
    context = new AudioContext();
    // Safari 17+: bez tego przełącznik wyciszenia w iPhonie wycisza Web Audio (głos Sawy z <audio> gra dalej)
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = "playback";
  }
  return context;
}

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!noise) {
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

function reverb(ctx: AudioContext): ConvolverNode {
  const length = Math.floor(ctx.sampleRate * REVERB_SEC);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  }
  const node = ctx.createConvolver();
  node.buffer = buffer;
  return node;
}

function oscillator(
  ctx: AudioContext,
  hz: number,
  t: number,
  sec: number,
  to: AudioNode,
  type: OscillatorType = "sine",
) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = hz;
  osc.connect(to);
  osc.start(t);
  osc.stop(t + sec + 0.05);
  return osc;
}

function lowpass(ctx: AudioContext, hz: number, to: AudioNode, q = 0.7) {
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = hz;
  filter.Q.value = q;
  filter.connect(to);
  return filter;
}

/** Elektryczne pianino z syntezy FM: jasny atak, który szybko mięknie. */
function keys(
  ctx: AudioContext,
  to: AudioNode,
  hz: number,
  t: number,
  velocity: number,
  sec: number,
) {
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(velocity, t + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + sec);
  amp.connect(to);
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(hz * 1.2, t);
  depth.gain.exponentialRampToValueAtTime(hz * 0.06, t + 0.8);
  const carrier = oscillator(ctx, hz, t, sec, amp);
  oscillator(ctx, hz, t, sec, depth);
  depth.connect(carrier.frequency);
}

/** Krótkie szarpnięcie fali prostokątnej przez filtr, który się zamyka. */
function pluck(
  ctx: AudioContext,
  to: AudioNode,
  hz: number,
  t: number,
  velocity: number,
  cutoffHz: number,
) {
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(velocity, t + 0.005);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  amp.connect(to);
  const filter = lowpass(ctx, cutoffHz, amp, 2);
  filter.frequency.setValueAtTime(cutoffHz * 1.8, t);
  filter.frequency.exponentialRampToValueAtTime(cutoffHz * 0.5, t + 0.25);
  oscillator(ctx, hz, t, 0.36, filter, "square");
}

/** Plama akordu: lekko rozstrojone pary oscylatorów, wolne wejście i wyjście. */
function pad(
  ctx: AudioContext,
  to: AudioNode,
  event: Extract<MusicEvent, { kind: "pad" }>,
  t: number,
) {
  const sec = event.durationSec;
  const rise = Math.min(2.5, sec * 0.35);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(event.velocity, t + rise);
  amp.gain.setValueAtTime(event.velocity, t + sec - rise);
  amp.gain.linearRampToValueAtTime(0, t + sec);
  amp.connect(to);
  const filter = lowpass(ctx, event.cutoffHz, amp, 0.3);
  for (const hz of event.hz) {
    for (const cents of [-6, 6])
      oscillator(ctx, hz, t, sec, filter, event.wave).detune.value = cents;
  }
}

function kick(ctx: AudioContext, to: AudioNode, t: number, velocity: number) {
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(velocity, t);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  amp.connect(to);
  const osc = oscillator(ctx, 110, t, 0.3, amp);
  osc.frequency.setValueAtTime(110, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
}

function hiss(
  ctx: AudioContext,
  to: AudioNode,
  t: number,
  velocity: number,
  sec: number,
  type: BiquadFilterType,
  hz: number,
) {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = hz;
  filter.Q.value = 0.7;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(velocity, t);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + sec);
  source.connect(filter).connect(amp).connect(to);
  source.start(t, Math.random());
  source.stop(t + sec + 0.05);
}

function play(ctx: AudioContext, to: AudioNode, event: MusicEvent, t: number) {
  const start = t + event.offsetSec;
  if (event.kind === "keys") keys(ctx, to, event.hz, start, event.velocity, event.durationSec);
  else if (event.kind === "pluck") pluck(ctx, to, event.hz, start, event.velocity, event.cutoffHz);
  else if (event.kind === "pad") pad(ctx, to, event, start);
  else if (event.kind === "kick") kick(ctx, to, start, event.velocity);
  else if (event.kind === "snare") hiss(ctx, to, start, event.velocity, 0.16, "bandpass", 2600);
  else hiss(ctx, to, start, event.velocity, 0.04, "highpass", 7500);
}

/** Trzask płyty: rzadkie kliknięcia na cichym szumie, w pętli. */
function crackle(ctx: AudioContext, to: AudioNode): AudioBufferSourceNode {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] =
      Math.random() < 0.0004 ? (Math.random() * 2 - 1) * 0.6 : (Math.random() * 2 - 1) * 0.02;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 1200;
  const amp = ctx.createGain();
  amp.gain.value = 0.25;
  source.connect(highpass).connect(amp).connect(to);
  source.start();
  return source;
}

/** Jeden utwór: wchodzi z wyciszenia i planuje swoje nuty, póki go nie zatrzymamy. */
function startTrack(ctx: AudioContext, track: Track, to: AudioNode): Playing {
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0, now);
  out.gain.linearRampToValueAtTime(1, now + FADE_SEC);
  out.connect(to);
  const wet = ctx.createGain();
  wet.gain.value = track.reverbWet;
  out.connect(wet).connect(reverb(ctx)).connect(to);
  const tone = lowpass(ctx, track.toneHz, out);
  const vinyl = track.vinyl ? crackle(ctx, out) : null;

  const step = track.create(Math.random);
  let n = 0;
  let next = now + 0.1;
  const schedule = () => {
    while (next < ctx.currentTime + LOOKAHEAD_SEC) {
      for (const event of step(n)) play(ctx, tone, event, next);
      next += track.stepSec;
      n++;
    }
  };
  schedule();
  const timer = setInterval(schedule, SCHEDULE_EVERY_MS);

  return {
    startedAt: now,
    stop: () => {
      clearInterval(timer);
      const t = ctx.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0, t + FADE_SEC);
      vinyl?.stop(t + FADE_SEC);
      // Zaplanowane nuty i pogłos wybrzmiewają w ciszy, potem odpinamy utwór
      setTimeout(
        () => {
          out.disconnect();
          wet.disconnect();
        },
        (FADE_SEC + LOOKAHEAD_SEC + REVERB_SEC) * 1000,
      );
    },
  };
}

/**
 * Utwory → przyciszanie pod głos → głośność muzyki → głośniki. Utwory grają na przemian
 * i przechodzą jeden w drugi (`shouldSwitchTrack`), zaczynając od lo-fi.
 */
function startSession(ctx: AudioContext, isSpeaking: () => boolean): Session {
  const master = ctx.createGain();
  master.gain.value = MUSIC_GAIN;
  master.connect(ctx.destination);
  const duck = ctx.createGain();
  duck.gain.value = isSpeaking() ? DUCKED_GAIN : 1;
  duck.connect(master);

  let index = 0;
  let playing = startTrack(ctx, trackAt(index), duck);
  const timer = setInterval(() => {
    if (!shouldSwitchTrack(ctx.currentTime - playing.startedAt, isSpeaking())) return;
    playing.stop();
    index++;
    playing = startTrack(ctx, trackAt(index), duck);
  }, SWITCH_CHECK_MS);

  return {
    duck,
    stop: () => {
      clearInterval(timer);
      playing.stop();
      setTimeout(() => master.disconnect(), (FADE_SEC + LOOKAHEAD_SEC + REVERB_SEC) * 1000);
    },
  };
}

/**
 * Muzyka w tle, póki `active`: cichnie, gdy Sawa mówi (`speaking`), i wraca w przerwach.
 * Przeglądarka pozwala na dźwięk dopiero po stuknięciu, więc każde stuknięcie budzi kontekst audio.
 */
export function useRideMusic(active: boolean, speaking: boolean) {
  const session = useRef<Session | null>(null);
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;

  useEffect(() => {
    if (!active) return;
    const ctx = audioContext();
    const wake = () => {
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
    };
    wake();
    const gestures = ["pointerdown", "touchend", "click"] as const;
    for (const type of gestures)
      window.addEventListener(type, wake, { capture: true, passive: true });
    session.current = startSession(ctx, () => speakingRef.current);
    return () => {
      for (const type of gestures) window.removeEventListener(type, wake, { capture: true });
      session.current?.stop();
      session.current = null;
    };
  }, [active]);

  useEffect(() => {
    const duck = session.current?.duck;
    if (!duck || !context) return;
    const t = context.currentTime;
    duck.gain.cancelScheduledValues(t);
    duck.gain.setValueAtTime(duck.gain.value, t);
    if (speaking) duck.gain.setTargetAtTime(DUCKED_GAIN, t, DUCK_TIME_CONSTANT_SEC);
    else duck.gain.setTargetAtTime(1, t + RELEASE_HOLD_SEC, RELEASE_TIME_CONSTANT_SEC);
  }, [speaking]);
}

// Wybór słuchacza na tym urządzeniu, jak motyw (features/theme): jeden magazyn dla menu i odtwarzacza
const listeners = new Set<() => void>();
/** Wybór z tej sesji, gdy magazyn jest zablokowany (prywatny tryb). */
let chosen: boolean | null = null;

function readMusicOn(): boolean {
  if (chosen !== null) return chosen;
  try {
    return parseMusicPreference(window.localStorage.getItem(MUSIC_STORAGE_KEY));
  } catch {
    return true;
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function setMusicOn(on: boolean) {
  chosen = on;
  try {
    if (on) window.localStorage.removeItem(MUSIC_STORAGE_KEY);
    else window.localStorage.setItem(MUSIC_STORAGE_KEY, "off");
  } catch {
    // Prywatny tryb albo zablokowany magazyn: wybór działa do przeładowania strony (`chosen`).
  }
  for (const listener of listeners) listener();
}

export function useMusicOn(): boolean {
  return useSyncExternalStore(subscribe, readMusicOn, () => false);
}
