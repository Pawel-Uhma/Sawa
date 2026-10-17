import {
  FAMILIARITY,
  type Familiarity,
  type Interest,
  interestsOfTags,
  type LatLng,
  type Route,
  STORY_STYLES,
  type StoryStyle,
  type Travel,
} from "@sawa/shared";
import { api } from "@/lib/api";
import { getMemory, heardCounts } from "./memory";
import type { LngLat, MockStop } from "./mock-data";
import type { Profile } from "./onboarding";
import { type RideEnd, rideEndRequest } from "./ride-end";

/**
 * Onboarding picks broad categories (`historical`, …); older detailed tags (e.g. `jewish_warsaw`)
 * still map to their category. An empty choice falls back to `historical`.
 */
export function toPlannerInterests(tags: readonly string[]): Interest[] {
  const interests = interestsOfTags(tags);
  return interests.length > 0 ? interests : ["historical"];
}

const oneOf = <T extends string>(values: readonly T[], value: string | null | undefined) =>
  values.find((v) => v === value);

/** Who listens: what the planner and the stories read from the onboarding answers. */
export type Listener = {
  interests: Interest[];
  familiarity?: Familiarity;
  storyStyle?: StoryStyle;
};

export function listenerOf(profile: Profile): Listener {
  return {
    interests: toPlannerInterests(profile.interests),
    familiarity: oneOf(FAMILIARITY, profile.familiarity),
    storyStyle: oneOf(STORY_STYLES, profile.storyStyle),
  };
}

/**
 * Plans a ride from `origin` (lib/start-point.ts) with `POST /v1/routes/plan`. Sends what Sawa
 * already told (lib/memory.ts), so places told in full give way to new ones.
 */
export async function planRoute(
  origin: LatLng,
  durationMin: number,
  profile: Profile,
  end: RideEnd = { type: "loop" },
  travel: Travel = "transit",
): Promise<Route> {
  const { interests, familiarity, storyStyle } = listenerOf(profile);
  const heard = heardCounts(getMemory());
  const res = await api.v1.routes.plan.$post({
    json: {
      origin,
      durationMin,
      interests,
      ...rideEndRequest(end),
      travel,
      familiarity,
      storyStyle,
      heard: Object.keys(heard).length > 0 ? heard : undefined,
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
    mode: route.legs[place.legIndex]?.mode,
    coord: [place.position.lng, place.position.lat],
    along: place.etaSec / totalSec,
    etaMin: Math.round(place.etaSec / 60),
    etaSec: place.etaSec,
    windowSec: place.windowSec,
  }));
}
