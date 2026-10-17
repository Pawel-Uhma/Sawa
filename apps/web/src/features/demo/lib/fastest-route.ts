import type { LatLng, Route, Travel } from "@sawa/shared";
import { useQuery } from "@tanstack/react-query";
import { listenerOf, planRoute } from "./api-data";
import type { Profile } from "./onboarding";
import type { RideEnd } from "./ride-end";

/**
 * Najszybsza droga z `origin` do wybranego celu: `destination` bez `durationMin` (T-104).
 * Jej czas to dolna granica suwaka (T-110). Bez celu albo gdy planer nie dojechał, zwraca null.
 */
export function useFastestRoute(
  origin: LatLng,
  end: RideEnd,
  travel: Travel,
  profile: Profile,
): Route | null {
  const destination = end.type === "destination" ? end.point : null;
  const interests = listenerOf(profile).interests.join(",");
  const { data } = useQuery({
    queryKey: ["route", "fastest", origin, destination, travel, interests],
    queryFn: () => planRoute(origin, undefined, profile, end, travel),
    enabled: destination !== null,
    staleTime: 5 * 60_000,
    retry: 1,
  });
  return data?.endsAtDestination ? data : null;
}
