import { type BikeStation, fromLngLat, type PlanRouteRequest, type Route } from "@sawa/shared";
import { alongWalkPaths } from "../domain/routing/build-route";
import type { ScorePrefs } from "../domain/routing/score";
import { type WheelMode, wheelStoryTimes } from "../domain/routing/travel-modes";
import type { PlacePoint } from "../domain/routing/types";
import { planWheelTour } from "../domain/routing/wheel-tour";
import { AppError } from "../lib/errors";
import type { BikeStationSource, WalkPathSource } from "./ports";

/** Road paths per mode: OSRM bike and car profiles (FOSSGIS by default). */
export type WheelPathSources = Partial<Record<WheelMode, WalkPathSource>>;

export type WheelPlanDeps = {
  bikeStations?: BikeStationSource;
  walkPaths?: WalkPathSource;
  wheelPaths?: WheelPathSources;
  logger?: { warn(obj: object, msg: string): void };
};

export type WheelPlanInput = {
  request: PlanRouteRequest;
  mode: WheelMode;
  placesById: Map<string, PlacePoint>;
  interests: ReadonlySet<string>;
  prefs: ScorePrefs;
  styleGapSec?: number;
  styleMaxSec?: number;
  attribution: string[];
  now: Date;
};

/** Veturilo stations for a bike plan; without them (feed down) one's own bike. */
async function stationsFor(deps: WheelPlanDeps, mode: WheelMode): Promise<BikeStation[]> {
  if (mode !== "bike" || !deps.bikeStations) return [];
  try {
    return (await deps.bikeStations.stations()).stations;
  } catch (err) {
    deps.logger?.warn({ err: String(err) }, "no veturilo stations, bike plan without them");
    return [];
  }
}

/**
 * A tour by bike or car (`planWheelTour`), then every leg put on its router's road (walks on
 * the walking one) with the places along those roads collected again (`alongWalkPaths`).
 */
export async function planWheels(deps: WheelPlanDeps, input: WheelPlanInput): Promise<Route> {
  const { request, mode } = input;
  const route = planWheelTour({
    mode,
    places: [...input.placesById.values()],
    placesById: input.placesById,
    origin: request.origin,
    end: request.returnToStart ? request.origin : request.destination,
    destination: request.destination,
    budgetSec: request.durationMin === undefined ? undefined : request.durationMin * 60,
    interests: input.interests,
    prefs: input.prefs,
    styleGapSec: input.styleGapSec,
    styleMaxSec: input.styleMaxSec,
    stations: await stationsFor(deps, mode),
    now: input.now,
    attribution: input.attribution,
  });
  if (!route) throw new AppError("NOT_FOUND", "Nie udało się ułożyć trasy z tych miejsc");

  const sourceOf = (legMode: Route["legs"][number]["mode"]) =>
    legMode === "walk" ? deps.walkPaths : legMode === mode ? deps.wheelPaths?.[mode] : undefined;
  const paths = await Promise.all(
    route.legs.map((leg) => {
      const source = sourceOf(leg.mode);
      return source && leg.lngLats.length >= 2
        ? source.path(leg.lngLats.map(fromLngLat))
        : undefined;
    }),
  );
  return alongWalkPaths(route, paths, {
    placesById: input.placesById,
    interests: input.interests,
    prefs: input.prefs,
    now: input.now,
    ...wheelStoryTimes(mode, input.styleGapSec, input.styleMaxSec),
  });
}
