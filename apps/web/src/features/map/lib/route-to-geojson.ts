import { type Leg, type Route, type TrackVehiclesResponse, toLngLat } from "@sawa/shared";
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
    /** Label over the ring: the line, at a transfer the change, e.g. "122 → 180". */
    label: string;
    /** The leg boarded here and, at a transfer, the ride leg left (-1 at the start). */
    legIndex: number;
    fromLegIndex: number;
    /** At a transfer, the line left (its number, mode and colour); empty at the start. */
    fromLine: string;
    fromMode: Leg["mode"] | "";
    fromColor: string;
    mode: Leg["mode"];
    color: string;
    /** Name with the ZTM post number, as on the stop sign: "Plac Zawiszy 05". */
    stopName: string;
    /** When the line is boarded, Warsaw time: "14:05", or "ok. 14:05" when estimated. */
    boardAt: string;
    /** Same, Warsaw time without "ok.", for the ring when it shows no countdown. */
    clock: string;
    /** Departure in ms since the epoch, for the countdown. */
    departAtMs: number;
    /** Minutes of walking right before boarding (to the first stop or across a transfer). */
    walkMin: number;
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
  /**
   * `id` is the place id, so a click opens the same card as a regular place.
   * `kind` and `subkind` pick the sticker; absent when the place is not among the loaded places.
   */
  properties: { id: string; name: string; order: number; kind?: string; subkind?: string | null };
};

/** What a route place looks like on the map, by place id (from the loaded place summaries). */
export type PlaceMarkers = ReadonlyMap<string, { kind: string; subkind?: string | null }>;

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
  return legLineIndexes(route.legs);
}

/** `lineIndexes` for a bare list of legs (the "Dojazd" list in the route sheet). */
export function legLineIndexes(legs: readonly Leg[]): number[] {
  let index = -1;
  let previous: Leg | undefined;
  return legs.map((leg) => {
    if (leg.mode === "walk") return -1;
    if (leg.line !== previous?.line || leg.fromStop.id !== previous.toStop.id) index += 1;
    previous = leg;
    return index;
  });
}

/** The whole route of a line ridden on a leg (`LegVehicles.shape`), in the leg's line colour. */
export type LineShapeFeature = {
  type: "Feature";
  geometry: { type: "LineString"; coordinates: LngLat[] };
  properties: { legIndex: number; lineIndex: number; line: string; color: string };
};

/**
 * Whole routes of the lines on the route, from `POST /v1/vehicles/track`. A line ridden on two
 * legs in a row is drawn once.
 */
export function lineShapesToGeoJson(
  route: Route,
  vehicles: TrackVehiclesResponse | undefined,
): FeatureCollection<LineShapeFeature> {
  const lines = lineIndexes(route);
  const seen = new Set<number>();
  const features: LineShapeFeature[] = [];
  for (const leg of vehicles?.legs ?? []) {
    const lineIndex = lines[leg.legIndex] ?? -1;
    if (!leg.shape || leg.shape.length < 2 || lineIndex < 0 || seen.has(lineIndex)) continue;
    seen.add(lineIndex);
    features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: leg.shape },
      properties: {
        legIndex: leg.legIndex,
        lineIndex,
        line: leg.line,
        color: lineColor(lineIndex),
      },
    });
  }
  return { type: "FeatureCollection", features };
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

/**
 * Legs lit up when leg `legIndex` is picked in the "Dojazd" list: a walk alone, a ride with
 * every leg of its line (`legLineIndexes`). Empty for a leg that is not on the route.
 */
export function highlightedLegs(legs: readonly Leg[], legIndex: number): number[] {
  const leg = legs[legIndex];
  if (!leg) return [];
  if (leg.mode === "walk") return [legIndex];
  const lines = legLineIndexes(legs);
  return lines.flatMap((line, i) => (line === lines[legIndex] ? [i] : []));
}

export type RoutePassedStopFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: LngLat };
  properties: { legIndex: number; color: string; name: string };
};

/**
 * Stops a ride passes without anyone getting off (`Leg.stops`): small dots along the line, so
 * the user can count how many stops are left to the one where they get off.
 */
export function routePassedStopsToGeoJson(route: Route): FeatureCollection<RoutePassedStopFeature> {
  const lines = lineIndexes(route);
  return {
    type: "FeatureCollection",
    features: route.legs.flatMap((leg, legIndex) =>
      leg.mode === "walk"
        ? []
        : (leg.stops ?? []).map((stop) => ({
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: toLngLat(stop.position) },
            properties: { legIndex, color: lineColor(lines[legIndex]), name: stop.name },
          })),
    ),
  };
}

/** Minutes of the walk legs right before `legIndex`. */
function walkBefore(legs: readonly Leg[], legIndex: number): number {
  let minutes = 0;
  for (let i = legIndex - 1; i >= 0 && legs[i].mode === "walk"; i -= 1) {
    minutes += legs[i].durationMin;
  }
  return minutes;
}

/** The ride leg before `legIndex` on another line: the line left at this transfer. */
function legLeft(legs: readonly Leg[], lines: readonly number[], legIndex: number): number | null {
  for (let i = legIndex - 1; i >= 0; i -= 1) {
    if (lines[i] >= 0 && lines[i] !== lines[legIndex]) return i;
  }
  return null;
}

function transferOf(legs: readonly Leg[], lines: readonly number[], legIndex: number) {
  const left = legLeft(legs, lines, legIndex);
  const from = left === null ? undefined : legs[left];
  return {
    legIndex,
    fromLegIndex: left ?? -1,
    label: from ? `${from.line} → ${legs[legIndex].line}` : legs[legIndex].line,
    fromLine: from?.line ?? "",
    fromMode: from?.mode ?? "",
    fromColor: left === null ? "" : lineColor(lines[left]),
  } as const;
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
          ...transferOf(route.legs, lines, legIndex),
          mode: leg.mode,
          color: lineColor(lines[legIndex]),
          stopName: [leg.fromStop.name, stopPost(leg.fromStop.id)].filter(Boolean).join(" "),
          boardAt: `${leg.realDeparture ? "" : "ok. "}${CLOCK.format(new Date(leg.departAt))}`,
          clock: CLOCK.format(new Date(leg.departAt)),
          departAtMs: Date.parse(leg.departAt),
          walkMin: walkBefore(route.legs, legIndex),
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

/**
 * Places along the route, numbered 1..n in the order they pass the window. With `markers`, each
 * place also gets the kind and subkind its sticker follows.
 */
export function routePlacesToGeoJson(
  route: Route,
  markers?: PlaceMarkers,
): FeatureCollection<RoutePlaceFeature> {
  const ordered = [...route.places].sort((a, b) => a.etaSec - b.etaSec);
  return {
    type: "FeatureCollection",
    features: ordered.map((place, i) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: toLngLat(place.position) },
      properties: {
        id: place.placeId,
        name: place.name,
        order: i + 1,
        ...markers?.get(place.placeId),
      },
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
