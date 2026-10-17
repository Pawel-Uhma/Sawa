import type { LatLng } from "@sawa/shared";

export const PLACE_KINDS = [
  "building",
  "monument",
  "plaque",
  "street",
  "site",
  "mural",
  "event",
  "church",
  "cemetery",
] as const;
export type PlaceKind = (typeof PLACE_KINDS)[number];

export type BBox = { minLng: number; minLat: number; maxLng: number; maxLat: number };

/** What the map and the route planner need. */
export type PlaceSummary = {
  id: string;
  name: string;
  kind: PlaceKind;
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

export type PlaceSource = { id: string; title: string; url: string };
export type PlacePerson = { name: string; role: string; wikiUrl?: string };
export type PlaceFormerName = { name: string; from?: string; to?: string };
export type PlacePhoto = {
  url: string;
  pageUrl: string | null;
  caption: string | null;
  year: string | null;
  author: string | null;
  source: string | null;
  license: string | null;
};

/** Everything the story needs: facts with source ids the LLM may cite. */
export type Place = PlaceSummary & {
  nameEn: string | null;
  summaryEn: string | null;
  addressToday: string | null;
  addressHistoric: string | null;
  period: string | null;
  stillExists: boolean | null;
  facts: string[];
  trivia: string[];
  people: PlacePerson[];
  formerNames: PlaceFormerName[];
  sources: PlaceSource[];
  unverifiedFacts: { text: string; reason: string }[];
  confidence: "high" | "medium" | "low" | null;
  locationPrecision: "exact" | "approx" | null;
  photos: PlacePhoto[];
};
