import type { LatLng, Route, Travel } from "@sawa/shared";
import { useEffect, useState } from "react";
import { planRoute } from "./api-data";
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
): FastestRoute {
  const [fastest, setFastest] = useState<FastestRoute>({ status: "none" });

  useEffect(() => {
    if (rideEnd.type !== "destination") {
      setFastest({ status: "none" });
      return;
    }
    let cancelled = false;
    setFastest({ status: "loading" });
    planRoute(origin, undefined, profile, rideEnd, travel)
      .then((route) => !cancelled && setFastest({ status: "ready", route }))
      .catch(() => !cancelled && setFastest({ status: "failed" }));
    return () => {
      cancelled = true;
    };
  }, [origin, profile, rideEnd, travel]);

  return fastest;
}
