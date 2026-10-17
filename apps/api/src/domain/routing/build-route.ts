import type { Leg, Route, RoutePlace, Stop } from "@sawa/shared";
import type { Ride } from "./beam-search";
import { cumulativeDistancesM, slicePolyline } from "./geometry";
import { selectStoryPlaces } from "./select-stories";
import type { Network, Pattern, PatternStop, PlacePoint } from "./types";

export type BuildRouteInput = {
  ride: Ride;
  network: Network;
  placesById: Map<string, PlacePoint>;
  /** Time of the request; all offsets in the ride count from here. */
  now: Date;
  attribution: string[];
};

const at = (now: Date, offsetSec: number) =>
  new Date(now.getTime() + offsetSec * 1000).toISOString();

function toStop(network: Network, stopId: string): Stop {
  const stop = network.stops.get(stopId);
  if (!stop) throw new Error(`Unknown stop ${stopId}`);
  return { id: stop.id, name: stop.name, position: stop.position };
}

/**
 * A planned ride → the API `Route`: legs with shapes, and the places Sawa narrates
 * (spaced by `selectStoryPlaces`) with their ETA and story window.
 */
export function buildRoute({
  ride,
  network,
  placesById,
  now,
  attribution,
}: BuildRouteInput): Route {
  const legs: Leg[] = ride.legs.map((leg) => {
    const pattern = network.patterns.get(leg.patternId) as Pattern;
    const board = pattern.stops[leg.boardIndex] as PatternStop;
    const alight = pattern.stops[leg.alightIndex] as PatternStop;
    const cumDistM = cumulativeDistancesM(pattern.lngLats);
    return {
      line: pattern.line,
      mode: pattern.mode,
      headsign: pattern.headsign,
      fromStop: toStop(network, board.stopId),
      toStop: toStop(network, alight.stopId),
      departAt: at(now, leg.boardElapsedSec),
      durationMin: Math.round((leg.alightElapsedSec - leg.boardElapsedSec) / 6) / 10,
      lngLats: slicePolyline(pattern.lngLats, cumDistM, board.alongM, alight.alongM),
    };
  });

  const sorted = selectStoryPlaces(ride.places);
  const places: RoutePlace[] = sorted.flatMap((p, i) => {
    const place = placesById.get(p.placeId);
    if (!place) return [];
    const nextEtaSec = sorted[i + 1]?.etaSec ?? ride.elapsedSec;
    return [
      {
        placeId: p.placeId,
        name: place.name,
        position: place.position,
        etaSec: Math.round(p.etaSec),
        windowSec: Math.max(0, Math.round(nextEtaSec - p.etaSec)),
        legIndex: p.legIndex,
        distanceM: Math.round(p.distanceM),
      },
    ];
  });

  return {
    id: ride.legs.map((l) => `${l.patternId}:${l.boardIndex}-${l.alightIndex}`).join("|"),
    legs,
    places,
    totalMin: Math.round(ride.elapsedSec / 6) / 10,
    endsAtStart: ride.endsAtStart,
    ...(ride.endsAtDestination === undefined ? {} : { endsAtDestination: ride.endsAtDestination }),
    attribution,
  };
}
