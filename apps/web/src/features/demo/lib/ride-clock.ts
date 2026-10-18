"use client";

import { haversineM, type LatLng } from "@sawa/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MockStop } from "./mock-data";

/** Sawa starts on a place this long before passing it: „zaraz mijamy”. */
export const LEAD_SEC = 15;
const TICK_MS = 1000;
/** GPS this close to a place counts as being there (accuracy in the city is tens of metres). */
export const ARRIVE_M = 150;

/** Seconds from the start of the ride to the place (planner `etaSec`, else the rounded minutes). */
export function etaSecOf(stop: Pick<MockStop, "etaMin" | "etaSec">): number {
  return stop.etaSec ?? stop.etaMin * 60;
}

/** When the story of this place should start, in seconds from the start of the ride. */
export function storyStartSec(stop: Pick<MockStop, "etaMin" | "etaSec">): number {
  return Math.max(0, etaSecOf(stop) - LEAD_SEC);
}

/** The last place whose story should have started by `rideSec` (0 before the first one). */
export function dueIndex(stops: readonly MockStop[], rideSec: number): number {
  let due = 0;
  stops.forEach((stop, index) => {
    if (storyStartSec(stop) <= rideSec) due = index;
  });
  return due;
}

/** Seconds until the first story, null once it is due: until then Sawa stays quiet. */
export function waitSec(stops: readonly MockStop[], rideSec: number): number | null {
  const first = stops[0];
  if (!first) return null;
  const left = storyStartSec(first) - rideSec;
  return left > 0 ? left : null;
}

/** Whether the phone is at the place (its `coord` is [lng, lat]). */
export function isAt(point: LatLng, stop: Pick<MockStop, "coord">): boolean {
  const [lng, lat] = stop.coord;
  return haversineM(point, { lat, lng }) <= ARRIVE_M;
}

/** GPS this close to some place on the route means the user really rides it (not testing at home). */
export const NEAR_ROUTE_M = 1000;

/** Whether the phone is near the route: then location, not time, says which place is next. */
export function isNearRoute(stops: readonly MockStop[], position: LatLng | null): boolean {
  if (!position) return false;
  return stops.some(({ coord: [lng, lat] }) => haversineM(position, { lat, lng }) <= NEAR_ROUTE_M);
}

/**
 * The furthest the clock may go on its own while location leads the ride: just before the
 * next place's story. The next place comes from GPS (`useGpsClockSync`) or the user, so a long
 * story or a slow ride does not move Sawa places ahead of the user. Null after the last place.
 */
export function capSecFor(stops: readonly MockStop[], rideSec: number): number | null {
  const next = stops[dueIndex(stops, rideSec) + 1];
  return next ? storyStartSec(next) - 1 : null;
}

/**
 * Whether the ride clock runs: before the first place it runs alone (Sawa waits for it),
 * after that only while Sawa plays. `held` is a stop or pause by the user: it stops the clock
 * also before the first place, so the slider and countdowns stand until the user resumes.
 */
export function isClockRunning(
  stops: readonly MockStop[],
  rideSec: number,
  isPlaying: boolean,
  held = false,
): boolean {
  return stops.length > 0 && !held && (isPlaying || waitSec(stops, rideSec) !== null);
}

/**
 * Time on the ride: starts with a new route, stops while Sawa is paused or stopped by the user
 * (`isClockRunning`) and goes on from there. `syncTo` moves it to a place the user picked.
 * With `gpsLeads` (phone near the route) it stops before the next place (`capSecFor`):
 * only GPS or the user moves it there.
 */
export function useRideClock(stops: readonly MockStop[], isPlaying: boolean, gpsLeads = false) {
  // Set in the effect: Date.now() during render breaks the prerender with cacheComponents.
  const startedAt = useRef(0);
  // Time belongs to its route: in the render with a new route the old ride's time is not used.
  const [tick, setTick] = useState({ stops, sec: 0 });
  const rideSec = tick.stops === stops ? tick.sec : 0;
  // Stopped by the user (stop or pause); like the time, it belongs to its route.
  const [hold, setHold] = useState({ stops, on: false });
  const held = hold.stops === stops && hold.on;
  const running = isClockRunning(stops, rideSec, isPlaying, held);
  // Where the clock stood when it stopped, so it goes on from there and not from the start
  const secRef = useRef(rideSec);
  secRef.current = rideSec;
  const gpsLeadsRef = useRef(gpsLeads);
  gpsLeadsRef.current = gpsLeads;

  useEffect(() => {
    setTick({ stops, sec: 0 });
  }, [stops]);

  useEffect(() => {
    if (!running) return;
    startedAt.current = Date.now() - secRef.current * 1000;
    const id = setInterval(() => {
      let sec = Math.floor((Date.now() - startedAt.current) / 1000);
      const cap = gpsLeadsRef.current ? capSecFor(stops, secRef.current) : null;
      if (cap !== null && sec > cap) {
        // Stands at the cap, so without GPS later it goes on from here and does not jump ahead
        sec = cap;
        startedAt.current = Date.now() - cap * 1000;
      }
      setTick((prev) => (prev.stops === stops && prev.sec === sec ? prev : { stops, sec }));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running, stops]);

  /** Moves the ride to `sec` (the slider in the podcast controls). */
  const seekTo = useCallback(
    (sec: number) => {
      const at = Math.max(0, Math.round(sec));
      startedAt.current = Date.now() - at * 1000;
      setTick({ stops, sec: at });
    },
    [stops],
  );

  const syncTo = useCallback(
    (index: number) => {
      const stop = stops[index];
      if (stop) seekTo(storyStartSec(stop));
    },
    [stops, seekTo],
  );

  /** The user stopped (true) or resumed (false) Sawa: the clock stands or goes on from there. */
  const setHeld = useCallback((on: boolean) => setHold({ stops, on }), [stops]);

  const due = dueIndex(stops, rideSec);
  const next = stops[due + 1];
  return {
    rideSec,
    dueIndex: due,
    /** Seconds until the first story; null once Sawa may talk. */
    waitSec: waitSec(stops, rideSec),
    /** Seconds until the next story should start; null after the last place. */
    nextInSec: next ? Math.max(0, storyStartSec(next) - rideSec) : null,
    /** The user stopped Sawa: the clock stands, also before the first place. */
    held,
    setHeld,
    syncTo,
    seekTo,
  };
}

export type RideClock = ReturnType<typeof useRideClock>;
