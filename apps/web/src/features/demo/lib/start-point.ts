import { HACKATHON_VENUE, haversineM, type LatLng } from "@sawa/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { type Lang, pick } from "@/features/i18n";

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
export function startLabel(status: StartStatus, lang: Lang = "pl"): string {
  switch (status) {
    case "venue":
      return pick(lang, "42 Warsaw (pokaz)", "42 Warsaw (demo)");
    case "locating":
      return pick(lang, "Szukam Cię… na razie 42 Warsaw", "Finding you… 42 Warsaw for now");
    case "located":
      return pick(lang, "Twoja lokalizacja", "Your location");
    case "denied":
      return pick(
        lang,
        "Brak zgody na lokalizację, startuję spod 42 Warsaw",
        "No location permission, starting from 42 Warsaw",
      );
    case "unavailable":
      return pick(
        lang,
        "Nie widzę lokalizacji, startuję spod 42 Warsaw",
        "Can't see your location, starting from 42 Warsaw",
      );
    case "outside":
      return pick(
        lang,
        "Jesteś poza Warszawą, startuję spod 42 Warsaw",
        "You're outside Warsaw, starting from 42 Warsaw",
      );
  }
}

/** Bez nowego odczytu przez tyle czasu Safari zwykle przestał śledzić, więc zaczynamy od nowa. */
export const GPS_STALL_MS = 20_000;

/** Po błędzie innym niż brak zgody pytamy o pozycję znowu po chwili. */
const GPS_RETRY_MS = 3_000;

/**
 * Start przejażdżki. Lokalizację śledzi dopiero, gdy `enabled` (po onboardingu),
 * żeby przeglądarka nie pytała o zgodę na pierwszym ekranie. `position` to każdy odczyt
 * GPS (kropka na mapie, zegar jazdy), `point` rusza się dopiero o `MIN_START_MOVE_M`.
 *
 * Safari na iOS po zgaszeniu ekranu, przejściu w tło albo po błędzie potrafi po cichu
 * zatrzymać `watchPosition`. Dlatego śledzenie startuje od nowa po powrocie na stronę,
 * po błędzie i gdy odczyty stoją dłużej niż `GPS_STALL_MS`. `retry()` pyta o zgodę jeszcze raz.
 */
export function useStartPoint(enabled: boolean) {
  const [mode, setModeState] = useState<StartMode>("gps");
  const [fix, setFix] = useState<LatLng | null>(null);
  const [position, setPosition] = useState<LatLng | null>(null);
  const [error, setError] = useState<GeoError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => setModeState(loadStartMode()), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt only restarts the watch (retry)
  useEffect(() => {
    if (!enabled || mode !== "gps") return;
    if (!("geolocation" in navigator)) {
      setError("unavailable");
      return;
    }
    const geo = navigator.geolocation;
    let watchId: number | null = null;
    let retryTimer: number | undefined;
    // Zero, dopóki przeglądarka nic nie odpowiedziała: wtedy może jeszcze czekać na zgodę
    let lastFixAt = 0;
    let isDenied = false;

    const stop = () => {
      window.clearTimeout(retryTimer);
      if (watchId !== null) geo.clearWatch(watchId);
      watchId = null;
    };
    const watch = () => {
      stop();
      isDenied = false;
      watchId = geo.watchPosition(
        ({ coords }) => {
          lastFixAt = Date.now();
          const next = { lat: coords.latitude, lng: coords.longitude };
          setPosition(next);
          setFix((current) =>
            current && haversineM(current, next) < MIN_START_MOVE_M ? current : next,
          );
          setError(null);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            stop();
            isDenied = true;
            // Bez zgody nie trzymamy starej pozycji, bo wyglądałaby jak żywy GPS
            setFix(null);
            setPosition(null);
            setError("denied");
            return;
          }
          if (lastFixAt === 0) lastFixAt = Date.now();
          setError("unavailable");
          window.clearTimeout(retryTimer);
          retryTimer = window.setTimeout(watch, GPS_RETRY_MS);
        },
        { enableHighAccuracy: true, maximumAge: 5_000, timeout: GPS_STALL_MS },
      );
    };

    // Po powrocie na stronę śledzenie zaczyna się od nowa. Po odmowie tylko wtedy, gdy zgoda
    // jest już w ustawieniach, bo inaczej Safari pytałby przy każdym przełączeniu karty.
    const resume = async () => {
      if (document.visibilityState !== "visible") return;
      if (isDenied && (await permissionState()) !== "granted") return;
      watch();
    };
    const checkStall = () => {
      if (document.visibilityState !== "visible" || isDenied || lastFixAt === 0) return;
      if (Date.now() - lastFixAt > GPS_STALL_MS) watch();
    };

    watch();
    const stallTimer = window.setInterval(checkStall, 5_000);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pageshow", resume);
    // Zgoda włączona w ustawieniach strony (Chrome, Safari 16+) od razu wraca na mapę
    let permission: PermissionStatus | null = null;
    const onPermission = () => {
      if (permission?.state === "granted" && isDenied) watch();
    };
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((status) => {
        permission = status;
        status.addEventListener("change", onPermission);
      })
      .catch(() => {});
    return () => {
      stop();
      window.clearInterval(stallTimer);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pageshow", resume);
      permission?.removeEventListener("change", onPermission);
    };
  }, [enabled, mode, attempt]);

  const setMode = useCallback((next: StartMode) => {
    saveStartMode(next);
    setModeState(next);
  }, []);

  /** Pyta o lokalizację jeszcze raz (przycisk po odmowie albo gdy GPS zamilkł). */
  const retry = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  // Z pozycją w ręku błąd kolejnego odczytu nic nie zmienia; nie przeliczamy wtedy startu (i trasy)
  const startError = fix ? null : error;
  const start = useMemo(() => resolveStart(mode, fix, startError), [mode, fix, startError]);
  // Poza trasą (start spod 42 Warsaw, brak zgody, poza Warszawą) nie udajemy, że wiemy, gdzie jest telefon
  const live = start.status === "located" ? position : null;
  return { ...start, position: live, mode, setMode, retry };
}

/** Stan zgody z Permissions API; null, gdy przeglądarka go nie zna. */
async function permissionState(): Promise<PermissionState | null> {
  try {
    return (await navigator.permissions?.query({ name: "geolocation" }))?.state ?? null;
  } catch {
    return null;
  }
}
