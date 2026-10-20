import { type BikeStation, type Route, toLngLat } from "@sawa/shared";
import type { Lang } from "@/features/i18n";
import type { LngLat } from "./bounds";
import type { FeatureCollection } from "./route-to-geojson";

/** A Veturilo station on the map; `role` marks where the route takes and leaves the bike. */
export type BikeStationFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: LngLat };
  properties: {
    id: string;
    name: string;
    role: "pickup" | "dropoff" | "other";
    /** Label under the pickup and drop-off stations; empty for the others. */
    label: string;
    bikes: number;
    docks: number;
  };
};

/** Polish plural: 1 rower, 2–4 rowery, 5 rowerów (12–14 too). */
export function polishPlural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const tens = n % 100;
  const units = n % 10;
  return units >= 2 && units <= 4 && (tens < 12 || tens > 14) ? few : many;
}

/** "Weź rower · 4 rowery" at the pickup, "Oddaj rower · 6 wolnych miejsc" at the drop-off. */
export function stationLabel(role: "pickup" | "dropoff", station: BikeStation, lang: Lang): string {
  if (role === "pickup") {
    const n = station.bikesAvailable;
    return lang === "en"
      ? `Take a bike · ${n} ${n === 1 ? "bike" : "bikes"}`
      : `Weź rower · ${n} ${polishPlural(n, "rower", "rowery", "rowerów")}`;
  }
  const n = station.docksAvailable;
  return lang === "en"
    ? `Return the bike · ${n} free ${n === 1 ? "dock" : "docks"}`
    : `Oddaj rower · ${n} ${polishPlural(n, "wolne miejsce", "wolne miejsca", "wolnych miejsc")}`;
}

/** Whether the route rides a bike (then the map shows Veturilo stations). */
export function hasBikeLeg(route: Route | undefined): boolean {
  return route?.legs.some((leg) => leg.mode === "bike") ?? false;
}

/**
 * Stations for the map: every station of the live list, and the route's pickup and drop-off
 * labelled with their counts (live when the list has them, else as when the route was planned).
 */
export function bikeStationsToGeoJson(
  route: Route | undefined,
  live: readonly BikeStation[],
  lang: Lang,
): FeatureCollection<BikeStationFeature> {
  const pickup = route?.bikeStations?.pickup;
  const dropoff = route?.bikeStations?.dropoff;
  const liveById = new Map(live.map((s) => [s.id, s]));
  const roleOf = (id: string) =>
    id === pickup?.id ? "pickup" : id === dropoff?.id ? "dropoff" : "other";
  const all = [...live];
  for (const own of [pickup, dropoff]) if (own && !liveById.has(own.id)) all.push(own);
  return {
    type: "FeatureCollection",
    features: all.map((station) => {
      const role = roleOf(station.id);
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: toLngLat(station.position) },
        properties: {
          id: station.id,
          name: station.name,
          role,
          label: role === "other" ? "" : stationLabel(role, station, lang),
          bikes: station.bikesAvailable,
          docks: station.docksAvailable,
        },
      };
    }),
  };
}
