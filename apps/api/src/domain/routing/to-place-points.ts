import { interestsOfTags } from "@sawa/shared";
import type { PlaceSummary } from "../place";
import { weightFromRichness } from "./score";
import type { PlacePoint } from "./types";

/** Places from the repository → what the planner scores (detailed tags → broad interests). */
export function toPlacePoints(places: PlaceSummary[]): PlacePoint[] {
  return places.map(({ id, name, kind, position, interests, richness }) => ({
    id,
    name,
    kind,
    position,
    interests: interestsOfTags(interests),
    weight: weightFromRichness(richness),
    richness,
  }));
}
