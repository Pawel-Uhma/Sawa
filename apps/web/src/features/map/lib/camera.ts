import { type LatLng, type Route, toLngLat } from "@sawa/shared";
import { boundsOf, type LngLat, type LngLatBounds } from "./bounds";
import { routeBounds } from "./route-to-geojson";

/** What the screen wants the map to show. */
export type MapCamera =
  | { type: "center"; center: LatLng; zoom?: number }
  /** Fit all points (e.g. user + next stop); a single point is centred instead. */
  | { type: "fit"; points: LatLng[]; maxZoom?: number }
  | { type: "route" };

export type MapPadding = { top: number; right: number; bottom: number; left: number };

export type CameraMove =
  | { type: "ease"; center: LngLat; zoom?: number }
  | { type: "fit"; bounds: LngLatBounds; maxZoom?: number };

/** Zoom used when a "fit" has only one point to show. */
export const SINGLE_POINT_ZOOM = 16;

/** Camera move for the requested view; without a request the map follows the route. Null = stay. */
export function resolveCamera(
  camera: MapCamera | undefined,
  route: Route | undefined,
): CameraMove | null {
  const request = camera ?? (route ? { type: "route" as const } : undefined);
  if (!request) return null;

  switch (request.type) {
    case "center":
      return { type: "ease", center: toLngLat(request.center), zoom: request.zoom };
    case "route": {
      const bounds = route && routeBounds(route);
      return bounds ? { type: "fit", bounds } : null;
    }
    case "fit": {
      if (request.points.length === 1) {
        return { type: "ease", center: toLngLat(request.points[0]), zoom: SINGLE_POINT_ZOOM };
      }
      const bounds = boundsOf(request.points.map(toLngLat));
      return bounds ? { type: "fit", bounds, maxZoom: request.maxZoom } : null;
    }
  }
}

/** Stable key, so the map moves only when the requested view really changes, not on each render. */
export function cameraMoveKey(move: CameraMove | null, padding: MapPadding): string {
  return JSON.stringify([move, padding]);
}
