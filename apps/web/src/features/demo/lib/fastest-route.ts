import type { LatLng, Route, Travel, Waypoint } from "@sawa/shared";
import { useEffect, useState } from "react";
import { planRoute } from "./api-data";
import { useBike } from "./bike-choice";
import { DURATION_STOPS_MIN } from "./mock-data";
import type { Profile } from "./onboarding";
import type { RideEnd } from "./ride-end";

/** Najkrótszy krok suwaka, w który mieści się najszybsza droga (dłuższa niż skala: ostatni krok). */
export function shortestStopFor(fastestMin: number): number {
  return (
    DURATION_STOPS_MIN.find((stop) => stop >= Math.ceil(fastestMin)) ??
    DURATION_STOPS_MIN[DURATION_STOPS_MIN.length - 1]
  );
}

const NO_WAYPOINTS: readonly Waypoint[] = [];

export type FastestRoute =
  | { status: "none" | "loading" | "failed" }
  | { status: "ready"; route: Route };

/**
 * Przy „Do celu” od razu pyta planer o najszybszą drogę (`destination` bez `durationMin`, #43).
 * Jej `totalMin` to dolna granica suwaka, a sama trasa wraca bez ponownego zapytania.
 */
export function useFastestRoute(
  origin: LatLng,
  profile: Profile,
  rideEnd: RideEnd,
  travel: Travel,
  /** Przystanki po drodze (#195): najszybsza droga też przez nie przechodzi. */
  waypoints: readonly Waypoint[] = NO_WAYPOINTS,
): FastestRoute {
  const [fastest, setFastest] = useState<FastestRoute>({ status: "none" });
  // Własny rower i Veturilo to różne trasy (dojście do stacji)
  const bike = useBike();

  // biome-ignore lint/correctness/useExhaustiveDependencies: planRoute czyta wybór roweru sam, `bike` tylko przelicza po zmianie
  useEffect(() => {
    if (rideEnd.type !== "destination") {
      setFastest({ status: "none" });
      return;
    }
    let cancelled = false;
    setFastest({ status: "loading" });
    planRoute(origin, undefined, profile, rideEnd, travel, waypoints)
      .then((route) => !cancelled && setFastest({ status: "ready", route }))
      .catch(() => !cancelled && setFastest({ status: "failed" }));
    return () => {
      cancelled = true;
    };
  }, [origin, profile, rideEnd, travel, waypoints, bike]);

  return fastest;
}
