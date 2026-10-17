import type { Bbox } from "../domain/routing/geometry";
import type { Network } from "../domain/routing/types";

/** Places as a GeoJSON FeatureCollection in the `places_in_bbox` format (file now, Supabase later). */
export interface PlacesSource {
  getPlacesInBbox(bbox: Bbox): Promise<unknown>;
}

/** Real departures from dane.um.warszawa.pl; undefined when unknown (no token, timeout, no data). */
export interface DepartureSource {
  nextDeparture(stopId: string, line: string, after: Date): Promise<Date | undefined>;
}

export type TransitData = {
  network: Network;
  serviceDate: string;
  attribution: string[];
};
