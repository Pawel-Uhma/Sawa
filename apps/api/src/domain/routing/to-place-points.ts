import type { PlaceSummary } from "../place";
import { weightFromRichness } from "./score";
import type { PlacePoint } from "./types";

/** Places from the repository → what the planner scores. */
export function toPlacePoints(places: PlaceSummary[]): PlacePoint[] {
  return places.map(({ id, name, position, interests, richness }) => ({
    id,
    name,
    position,
    interests,
    weight: weightFromRichness(richness),
  }));
}
