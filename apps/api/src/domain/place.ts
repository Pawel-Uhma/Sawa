import type { LatLng, PlaceKind, PlaceSubkind } from "@sawa/shared";

/** The full place is the contract type (packages/shared); the API returns it unchanged. */
export type { Place, PlaceKind, PlacePhoto, PlaceSource } from "@sawa/shared";
export { PLACE_KINDS } from "@sawa/shared";

export type BBox = { minLng: number; minLat: number; maxLng: number; maxLat: number };

/** What the map and the route planner need. */
export type PlaceSummary = {
  id: string;
  name: string;
  kind: PlaceKind;
  /** Map marker; null until the seed sets it. */
  subkind?: PlaceSubkind | null;
  interests: string[];
  position: LatLng;
  /** facts + trivia count; higher = more to tell */
  richness: number;
};

/** A place found along a route line. */
export type PlaceAlongLine = PlaceSummary & {
  distanceM: number;
  /** Position along the line: 0 = start, 1 = end. */
  fraction: number;
};
