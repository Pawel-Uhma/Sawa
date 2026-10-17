import { type Leg, type Route, toLngLat } from "@sawa/shared";

type LngLat = [number, number];

export type RouteLegFeature = {
  type: "Feature";
  geometry: { type: "LineString"; coordinates: LngLat[] };
  properties: { legIndex: number; line: string; mode: Leg["mode"] };
};

export type RoutePlaceFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: LngLat };
  /** `id` is the place id, so a click opens the same card as a regular place. */
  properties: { id: string; name: string; order: number };
};

export type FeatureCollection<F> = { type: "FeatureCollection"; features: F[] };

export function routeLegsToGeoJson(route: Route): FeatureCollection<RouteLegFeature> {
  return {
    type: "FeatureCollection",
    features: route.legs
      .map((leg, legIndex) => ({ leg, legIndex }))
      .filter(({ leg }) => leg.lngLats.length >= 2)
      .map(({ leg, legIndex }) => ({
        type: "Feature",
        geometry: { type: "LineString", coordinates: leg.lngLats },
        properties: { legIndex, line: leg.line, mode: leg.mode },
      })),
  };
}

/** Places along the route, numbered 1..n in the order they pass the window. */
export function routePlacesToGeoJson(route: Route): FeatureCollection<RoutePlaceFeature> {
  const ordered = [...route.places].sort((a, b) => a.etaSec - b.etaSec);
  return {
    type: "FeatureCollection",
    features: ordered.map((place, i) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: toLngLat(place.position) },
      properties: { id: place.placeId, name: place.name, order: i + 1 },
    })),
  };
}

/** [[west, south], [east, north]] around every leg shape and route place; null when empty. */
export function routeBounds(route: Route): [LngLat, LngLat] | null {
  const points: LngLat[] = [
    ...route.legs.flatMap((leg) => leg.lngLats),
    ...route.places.map((place) => toLngLat(place.position)),
  ];
  if (points.length === 0) return null;
  const lngs = points.map(([lng]) => lng);
  const lats = points.map(([, lat]) => lat);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}
