import { HACKATHON_VENUE, haversineM, type LatLng } from "@sawa/shared";
import { useCallback, useEffect, useMemo, useState } from "react";

/** Skąd rusza przejażdżka: z miejsca, gdzie jest telefon, albo spod 42 Warsaw (pokaz). */
export type StartMode = "gps" | "venue";

export type StartStatus = "venue" | "locating" | "located" | "denied" | "unavailable" | "outside";

export type StartPoint = { status: StartStatus; point: LatLng };

type GeoError = "denied" | "unavailable";

/** Planer zna tylko rozkład ZTM, więc z dalszego miejsca startujemy spod 42 Warsaw. */
export const MAX_START_DISTANCE_M = 30_000;

/** Mniejsze przesunięcia GPS nie ruszają kamery ani podglądu trasy. */
export const MIN_START_MOVE_M = 50;

const START_KEY = "sawa.start.v1";

/** Bez zapisanego wyboru startujemy z prawdziwej lokalizacji. */
export function loadStartMode(): StartMode {
  try {
    return window.localStorage.getItem(START_KEY) === "venue" ? "venue" : "gps";
  } catch {
    return "gps";
  }
}

export function saveStartMode(mode: StartMode) {
  try {
    window.localStorage.setItem(START_KEY, mode);
  } catch {
    // Bez localStorage wybór wróci do lokalizacji przy następnej wizycie.
  }
}

/** Punkt startu dla planera; bez lokalizacji (jeszcze, brak zgody, poza Warszawą) to 42 Warsaw. */
export function resolveStart(
  mode: StartMode,
  fix: LatLng | null,
  error: GeoError | null,
): StartPoint {
  if (mode === "venue") return { status: "venue", point: HACKATHON_VENUE };
  if (fix) {
    return haversineM(fix, HACKATHON_VENUE) > MAX_START_DISTANCE_M
      ? { status: "outside", point: HACKATHON_VENUE }
      : { status: "located", point: fix };
  }
  if (error) return { status: error, point: HACKATHON_VENUE };
  return { status: "locating", point: HACKATHON_VENUE };
}

/** Podpis startu w menu i w zakładce Przejażdżki. */
export function startLabel(status: StartStatus): string {
  switch (status) {
    case "venue":
      return "42 Warsaw (pokaz)";
    case "locating":
      return "Szukam Cię… na razie 42 Warsaw";
    case "located":
      return "Twoja lokalizacja";
    case "denied":
      return "Brak zgody na lokalizację, startuję spod 42 Warsaw";
    case "unavailable":
      return "Nie widzę lokalizacji, startuję spod 42 Warsaw";
    case "outside":
      return "Jesteś poza Warszawą, startuję spod 42 Warsaw";
  }
}

/**
 * Start przejażdżki. Lokalizację śledzi dopiero, gdy `enabled` (po onboardingu),
 * żeby przeglądarka nie pytała o zgodę na pierwszym ekranie.
 */
export function useStartPoint(enabled: boolean) {
  const [mode, setModeState] = useState<StartMode>("gps");
  const [fix, setFix] = useState<LatLng | null>(null);
  const [error, setError] = useState<GeoError | null>(null);

  useEffect(() => setModeState(loadStartMode()), []);

  useEffect(() => {
    if (!enabled || mode !== "gps") return;
    if (!("geolocation" in navigator)) {
      setError("unavailable");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const next = { lat: coords.latitude, lng: coords.longitude };
        setFix((current) =>
          current && haversineM(current, next) < MIN_START_MOVE_M ? current : next,
        );
        setError(null);
      },
      (err) => setError(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 20_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled, mode]);

  const setMode = useCallback((next: StartMode) => {
    saveStartMode(next);
    setModeState(next);
  }, []);

  const start = useMemo(() => resolveStart(mode, fix, error), [mode, fix, error]);
  return { ...start, mode, setMode };
}
