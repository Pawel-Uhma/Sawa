import { type Interest, interestsOfTags, type Route } from "@sawa/shared";
import { api } from "@/lib/api";
import type { LngLat, MockStop } from "./mock-data";
import { USER_LOCATION } from "./mock-data";

/** Pin on the map: a place from `GET /v1/places`. */
export type PlacePin = { id: string; name: string; coord: LngLat };

/** Box around the demo start: about 1.5 km each way, enough for the first stops. */
const DEMO_BBOX = { minLng: 20.955, minLat: 52.222, maxLng: 21.003, maxLat: 52.248 };

/** Places visible in the demo area. Throws when the API is down; the caller shows the empty map. */
export async function fetchPlacePins(): Promise<PlacePin[]> {
  const { minLng, minLat, maxLng, maxLat } = DEMO_BBOX;
  const res = await api.v1.places.$get({
    query: { bbox: `${minLng},${minLat},${maxLng},${maxLat}` },
  });
  if (!res.ok) throw new Error(`GET /v1/places: ${res.status}`);
  const body = await res.json();
  return body.features.map((feature) => ({
    id: feature.properties.id,
    name: feature.properties.name,
    coord: feature.geometry.coordinates,
  }));
}

/**
 * Onboarding stores detailed tags (e.g. `jewish_warsaw`); the planner takes broad categories.
 * Every onboarding tag maps to one category, so an empty choice falls back to `historical`.
 */
export function toPlannerInterests(tags: readonly string[]): Interest[] {
  const interests = interestsOfTags(tags);
  return interests.length > 0 ? interests : ["historical"];
}

/** Plans a ride from the demo start with `POST /v1/routes/plan`. */
export async function planRoute(durationMin: number, tags: readonly string[]): Promise<Route> {
  const res = await api.v1.routes.plan.$post({
    json: {
      origin: { lat: USER_LOCATION[1], lng: USER_LOCATION[0] },
      durationMin,
      interests: toPlannerInterests(tags),
      returnToStart: false,
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
