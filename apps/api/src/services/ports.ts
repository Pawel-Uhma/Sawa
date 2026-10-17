import type { LatLng } from "@sawa/shared";
import type { BBox, Place, PlaceAlongLine, PlaceSummary } from "../domain/place";

/** Interfaces services depend on; adapters implement them (docs/11-zasady-pracy-i-kodu.md §4). */

export interface PlacesRepository {
  /** Places inside the box, richest first. `interests` keeps places matching any of them. */
  listInBBox(bbox: BBox, interests?: string[]): Promise<PlaceSummary[]>;
  /** One place with facts, sources and photos; null when the id is unknown. */
  getById(id: string): Promise<Place | null>;
  /** Places within `radiusM` of the line, ordered from its start to its end. */
  listNearLine(line: LatLng[], radiusM: number, interests?: string[]): Promise<PlaceAlongLine[]>;
}
