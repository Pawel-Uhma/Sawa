import type { LatLng } from "./schemas/common";

const EARTH_RADIUS_M = 6_371_000;

/** 42 Warsaw, al. Solidarności 171: default location and demo start. */
export const HACKATHON_VENUE: LatLng = { lat: 52.2359, lng: 20.9789 };

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** GeoJSON and MapLibre use [lng, lat]; convert only at that boundary. */
export function toLngLat(p: LatLng): [number, number] {
  return [p.lng, p.lat];
}

export function fromLngLat([lng, lat]: [number, number]): LatLng {
  return { lat, lng };
}
