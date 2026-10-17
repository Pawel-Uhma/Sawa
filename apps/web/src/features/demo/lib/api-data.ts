import { type Interest, interestsOfTags, type Route } from "@sawa/shared";
import { api } from "@/lib/api";
import type { LngLat, MockStop } from "./mock-data";
import { USER_LOCATION } from "./mock-data";
import { type RideEnd, rideEndRequest } from "./ride-end";

/**
 * Onboarding stores detailed tags (e.g. `jewish_warsaw`); the planner takes broad categories.
 * Every onboarding tag maps to one category, so an empty choice falls back to `historical`.
 */
export function toPlannerInterests(tags: readonly string[]): Interest[] {
  const interests = interestsOfTags(tags);
  return interests.length > 0 ? interests : ["historical"];
}

/** Plans a ride from the demo start with `POST /v1/routes/plan`. */
export async function planRoute(
  durationMin: number,
  tags: readonly string[],
  end: RideEnd = { type: "open" },
): Promise<Route> {
  const res = await api.v1.routes.plan.$post({
    json: {
      origin: { lat: USER_LOCATION[1], lng: USER_LOCATION[0] },
      durationMin,
      interests: toPlannerInterests(tags),
      ...rideEndRequest(end),
    },
  });
  if (!res.ok) throw new Error(`POST /v1/routes/plan: ${res.status}`);
  return res.json();
}

/** The ride's shape for MapLibre: all legs in order. */
export function routeLine(route: Route): LngLat[] {
  return route.legs.flatMap((leg) => leg.lngLats);
}

/** Route places as the stops the sheet and the story card already render. */
export function routeStops(route: Route): MockStop[] {
  const totalSec = Math.max(route.totalMin * 60, 1);
  return route.places.map((place) => ({
    id: place.placeId,
    name: place.name,
    interest: "",
    line: route.legs[place.legIndex]?.line ?? "",
    coord: [place.position.lng, place.position.lat],
    along: place.etaSec / totalSec,
    etaMin: Math.round(place.etaSec / 60),
  }));
}
