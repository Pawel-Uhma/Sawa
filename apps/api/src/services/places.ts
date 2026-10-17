import { type PlacesQuery, type PlacesResponse, toLngLat } from "@sawa/shared";
import type { Place } from "../domain/place";
import { AppError } from "../lib/errors";
import type { PlacesRepository } from "./ports";

export async function listPlaces(
  places: PlacesRepository,
  { bbox, interests }: PlacesQuery,
): Promise<PlacesResponse> {
  const found = await places.listInBBox(bbox, interests);
  return {
    type: "FeatureCollection",
    features: found.map(({ position, id, name, kind, interests, richness }) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: toLngLat(position) },
      properties: { id, name, kind, interests, richness },
    })),
  };
}

export async function getPlace(places: PlacesRepository, id: string): Promise<Place> {
  const place = await places.getById(id);
  if (!place) throw new AppError("NOT_FOUND", `Place "${id}" not found`);
  return place;
}
