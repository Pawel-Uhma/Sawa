import type { LatLng, PlanRouteRequest, Route } from "@sawa/shared";
import type { BBox } from "../domain/place";
import { planRide } from "../domain/routing/beam-search";
import { buildRoute } from "../domain/routing/build-route";
import { computePlaceHits } from "../domain/routing/place-hits";
import { shiftRide } from "../domain/routing/shift-ride";
import { toPlacePoints } from "../domain/routing/to-place-points";
import type { PlaceHit, PlacePoint } from "../domain/routing/types";
import { AppError } from "../lib/errors";
import type { DepartureSource, PlacesRepository, TransitData } from "./ports";

const M_PER_DEG_LAT = 111_320;
const GRID_DEG = 0.05; // bbox snapped to a grid so nearby requests share the cache
const CACHE_SIZE = 20;
/** A tram covers ~15 km/h on average; a ride rarely gets farther than this from the origin. */
const reachKm = (durationMin: number) => Math.min(20, Math.max(4, durationMin * 0.15));

export type RoutePlanner = {
  plan(request: PlanRouteRequest, now: Date): Promise<Route>;
};

type Prepared = { hitsByPattern: Map<string, PlaceHit[]>; placesById: Map<string, PlacePoint> };

function reachableBbox(origin: LatLng, durationMin: number): BBox {
  const km = reachKm(durationMin);
  const dLat = (km * 1000) / M_PER_DEG_LAT;
  const dLng = dLat / Math.cos((origin.lat * Math.PI) / 180);
  const down = (v: number) => Math.floor(v / GRID_DEG) * GRID_DEG;
  const up = (v: number) => Math.ceil(v / GRID_DEG) * GRID_DEG;
  return {
    minLng: down(origin.lng - dLng),
    minLat: down(origin.lat - dLat),
    maxLng: up(origin.lng + dLng),
    maxLat: up(origin.lat + dLat),
  };
}

export function createRoutePlanner(deps: {
  transit: TransitData;
  places: Pick<PlacesRepository, "listInBBox">;
  departures?: DepartureSource;
}): RoutePlanner {
  const { network, attribution } = deps.transit;
  const cache = new Map<string, Promise<Prepared>>();

  async function prepare(bbox: BBox): Promise<Prepared> {
    const key = `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`;
    let prepared = cache.get(key);
    if (!prepared) {
      prepared = deps.places.listInBBox(bbox).then((summaries) => {
        const places = toPlacePoints(summaries);
        return {
          hitsByPattern: computePlaceHits(network, places),
          placesById: new Map(places.map((p) => [p.id, p])),
        };
      });
      prepared.catch(() => cache.delete(key));
      cache.set(key, prepared);
      if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value as string);
    }
    return prepared;
  }

  return {
    async plan(request, now) {
      const { hitsByPattern, placesById } = await prepare(
        reachableBbox(request.origin, request.durationMin),
      );
      let ride = planRide({
        network,
        hitsByPattern,
        placesById,
        origin: request.origin,
        budgetSec: request.durationMin * 60,
        interests: new Set(request.interests),
        returnToStart: request.returnToStart,
      });
      if (!ride) {
        throw new AppError("NOT_FOUND", "Brak przystanku tramwaju ani autobusu w promieniu 500 m");
      }

      const first = ride.legs[0];
      const pattern = first && network.patterns.get(first.patternId);
      const boardStop = pattern?.stops[first.boardIndex];
      if (deps.departures && first && pattern && boardStop) {
        const atStop = new Date(now.getTime() + ride.walkSec * 1000);
        const departure = await deps.departures.nextDeparture(
          boardStop.stopId,
          pattern.line,
          atStop,
        );
        if (departure) {
          ride = shiftRide(
            ride,
            (departure.getTime() - now.getTime()) / 1000 - first.boardElapsedSec,
          );
        }
      }

      return buildRoute({ ride, network, placesById, now, attribution });
    },
  };
}
