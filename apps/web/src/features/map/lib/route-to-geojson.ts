import { type Leg, type Route, toLngLat } from "@sawa/shared";
import { boundsOf, type LngLat, type LngLatBounds } from "./bounds";
import { lineColor } from "./map-style";

export type RouteLegFeature = {
  type: "Feature";
  geometry: { type: "LineString"; coordinates: LngLat[] };
  /** `lineIndex` counts boarded lines: consecutive legs on the same line share it and its colour. */
  properties: {
    legIndex: number;
    line: string;
    mode: Leg["mode"];
    lineIndex: number;
    color: string;
  };
};

/** A stop where a line is boarded: the start (`order` 0) or a transfer. */
export type RouteBoardingFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: LngLat };
  properties: {
    line: string;
    mode: Leg["mode"];
    color: string;
    /** Name with the ZTM post number, as on the stop sign: "Plac Zawiszy 05". */
    stopName: string;
    /** When the line is boarded, Warsaw time: "14:05", or "ok. 14:05" when estimated. */
    boardAt: string;
    isTransfer: boolean;
  };
};

/** Walk between the stop a line was left at and the stop the next one is boarded at. */
export type RouteWalkFeature = {
  type: "Feature";
  geometry: { type: "LineString"; coordinates: LngLat[] };
  properties: { legIndex: number };
};

export type RoutePlaceFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: LngLat };
  /** `id` is the place id, so a click opens the same card as a regular place. */
  properties: { id: string; name: string; order: number };
};

// The ZTM timetable is in Warsaw time, whatever the phone's time zone
const CLOCK = new Intl.DateTimeFormat("pl-PL", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Warsaw",
});

/**
 * A ZTM stop id is the stop group (4 digits) and the post (2 digits): "700905" is post 05.
 * Ids in another form (mocks) have no post number.
 */
export function stopPost(stopId: string): string | null {
  return /^\d{6}$/.test(stopId) ? stopId.slice(4) : null;
}

export type FeatureCollection<F> = { type: "FeatureCollection"; features: F[] };

/**
 * For each leg, the index of the line it belongs to; a new line starts when `line` changes or
 * the leg starts at another stop than the previous ride ended (a transfer to the same number).
 * Walk legs belong to no line (-1) and don't break a line that continues after them.
 */
export function lineIndexes(route: Route): number[] {
  let index = -1;
  let previous: Leg | undefined;
  return route.legs.map((leg) => {
    if (leg.mode === "walk") return -1;
    if (leg.line !== previous?.line || leg.fromStop.id !== previous.toStop.id) index += 1;
    previous = leg;
    return index;
  });
}

export function routeLegsToGeoJson(route: Route): FeatureCollection<RouteLegFeature> {
  const lines = lineIndexes(route);
  return {
    type: "FeatureCollection",
    features: route.legs
      .map((leg, legIndex) => ({ leg, legIndex }))
      .filter(({ leg }) => leg.mode !== "walk" && leg.lngLats.length >= 2)
      .map(({ leg, legIndex }) => ({
        type: "Feature",
        geometry: { type: "LineString", coordinates: leg.lngLats },
        properties: {
          legIndex,
          line: leg.line,
          mode: leg.mode,
          lineIndex: lines[legIndex],
          color: lineColor(lines[legIndex]),
        },
      })),
  };
}

/** Boarding points: the first stop of the ride and every stop where the line changes. */
export function routeBoardingsToGeoJson(route: Route): FeatureCollection<RouteBoardingFeature> {
  const lines = lineIndexes(route);
  return {
    type: "FeatureCollection",
    features: route.legs
      .map((leg, legIndex) => ({ leg, legIndex }))
      .filter(
        ({ legIndex }) =>
          lines[legIndex] >= 0 && !lines.slice(0, legIndex).includes(lines[legIndex]),
      )
      .map(({ leg, legIndex }) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: toLngLat(leg.fromStop.position) },
        properties: {
          line: leg.line,
          mode: leg.mode,
          color: lineColor(lines[legIndex]),
          stopName: [leg.fromStop.name, stopPost(leg.fromStop.id)].filter(Boolean).join(" "),
          boardAt: `${leg.realDeparture ? "" : "ok. "}${CLOCK.format(new Date(leg.departAt))}`,
          isTransfer: lines[legIndex] > 0,
        },
      })),
  };
}

/**
 * Walk legs, plus walks at transfers where the next leg starts at a different stop than the
 * previous one ended.
 */
export function routeWalksToGeoJson(route: Route): FeatureCollection<RouteWalkFeature> {
  const walkLegs: RouteWalkFeature[] = route.legs.flatMap((leg, legIndex) =>
    leg.mode === "walk"
      ? [
          {
            type: "Feature" as const,
            geometry: {
              type: "LineString" as const,
              coordinates:
                leg.lngLats.length >= 2
                  ? leg.lngLats
                  : [toLngLat(leg.fromStop.position), toLngLat(leg.toStop.position)],
            },
            properties: { legIndex },
          },
        ]
      : [],
  );
  return {
    type: "FeatureCollection",
    features: walkLegs.concat(
      route.legs.slice(1).flatMap((leg, i) => {
        const previous = route.legs[i];
        const from = previous.lngLats.at(-1) ?? toLngLat(previous.toStop.position);
        const to = leg.lngLats[0] ?? toLngLat(leg.fromStop.position);
        if (from[0] === to[0] && from[1] === to[1]) return [];
        return [
          {
            type: "Feature" as const,
            geometry: { type: "LineString" as const, coordinates: [from, to] },
            properties: { legIndex: i + 1 },
          },
        ];
      }),
    ),
  };
}

/** Places along the route, numbered 1..n in the order they pass the window. */
export function routePlacesToGeoJson(route: Route): FeatureCollection<RoutePlaceFeature> {
  const ordered = [...route.places].sort((a, b) => a.etaSec - b.etaSec);
  return {
    type: "FeatureCollection",
    features: ordered.map((place, i) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: toLngLat(place.position) },
      properties: { id: place.placeId, name: place.name, order: i + 1 },
    })),
  };
}

/** [[west, south], [east, north]] around every leg shape and route place; null when empty. */
export function routeBounds(route: Route): LngLatBounds | null {
  return boundsOf([
    ...route.legs.flatMap((leg) => leg.lngLats),
    ...route.places.map((place) => toLngLat(place.position)),
  ]);
}
