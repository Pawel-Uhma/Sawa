import type { LatLng } from "@sawa/shared";

export type LngLat = [number, number];
export type Mode = "tram" | "bus";

export type PatternStop = {
  stopId: string;
  /** Median travel time from the first stop of the pattern. */
  atSec: number;
  /** Distance along the pattern shape. */
  alongM: number;
};

/** One line + direction + stop sequence, as it runs on the chosen service day. */
export type Pattern = {
  id: string;
  line: string;
  mode: Mode;
  headsign: string;
  stops: PatternStop[];
  lngLats: LngLat[];
  headwaySec: number;
};

/** A platform. `groupId` joins the platforms of one stop (ZTM "zespół"), where transfers happen. */
export type NetworkStop = { id: string; groupId: string; name: string; position: LatLng };

export type StopVisit = { patternId: string; index: number };

export type Network = {
  patterns: Map<string, Pattern>;
  stops: Map<string, NetworkStop>;
  /** Patterns calling at any platform of a stop group. */
  visitsByGroup: Map<string, StopVisit[]>;
};

export type PlacePoint = {
  id: string;
  name: string;
  position: LatLng;
  interests: string[];
  weight: number;
};

/** A place visible from a pattern, at a time offset from the pattern's first stop. */
export type PlaceHit = {
  placeId: string;
  atSec: number;
  distanceM: number;
};
