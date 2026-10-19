import { type LatLng, type Route, toLngLat } from "@sawa/shared";
import { boundsOf, type LngLat, type LngLatBounds } from "./bounds";
import { routeBounds } from "./route-to-geojson";

/** What the screen wants the map to show. */
export type MapCamera =
  | { type: "center"; center: LatLng; zoom?: number }
  /** Fit all points (e.g. user + next stop); a single point is centred instead. */
  | { type: "fit"; points: LatLng[]; maxZoom?: number }
  | { type: "route" }
  /** Keep the view as it is, e.g. while the target is still loading (one move once it is known, #117). */
  | { type: "stay" };

export type MapPadding = { top: number; right: number; bottom: number; left: number };

/** Leaves room for the place card on phones when a screen gives no padding. */
export const DEFAULT_MAP_PADDING: MapPadding = { top: 48, right: 32, bottom: 200, left: 32 };

/** Place card from `place-sheet.tsx`: left panel (16 + 380 + 16 px) from `md`, below it a bottom sheet up to half the height. */
const SHEET_SIDE_MIN_WIDTH = 768;
const SHEET_SIDE_SPACE = 412;
const SHEET_BOTTOM_SHARE = 0.5;

/** Padding that also keeps the camera target clear of the open place card. */
export function paddingWithSheet(
  padding: MapPadding,
  container: { width: number; height: number },
): MapPadding {
  if (container.width >= SHEET_SIDE_MIN_WIDTH) {
    return { ...padding, left: Math.max(padding.left, SHEET_SIDE_SPACE) };
  }
  return {
    ...padding,
    bottom: Math.max(padding.bottom, Math.round(container.height * SHEET_BOTTOM_SHARE)),
  };
}

/** At least this share of the map stays free of padding, so a camera move always has room. */
export const MIN_FREE_SHARE = 0.35;

/**
 * Padding shrunk proportionally when the panels would cover nearly all of the map (a narrow
 * desktop window: story panel on the left, "Dojazd" card on the right). MapLibre refuses to
 * move at all when the padding does not leave room ("Map cannot fit").
 */
export function fitPadding(
  padding: MapPadding,
  container: { width: number; height: number },
): MapPadding {
  const scale = (a: number, b: number, size: number) => {
    const max = size * (1 - MIN_FREE_SHARE);
    return a + b > max && a + b > 0 ? max / (a + b) : 1;
  };
  const x = scale(padding.left, padding.right, container.width);
  const y = scale(padding.top, padding.bottom, container.height);
  return {
    top: Math.floor(padding.top * y),
    bottom: Math.floor(padding.bottom * y),
    left: Math.floor(padding.left * x),
    right: Math.floor(padding.right * x),
  };
}

/**
 * Padding to pass to `fitBounds` on top of the padding already set on the map. MapLibre adds
 * the two (camera_helper `cameraForBoxAndBearing`), and every `easeTo` with padding leaves it
 * set, so passing the whole padding again counted the panels twice and the fit failed
 * ("Map cannot fit"), e.g. after the camera had followed the story.
 */
export function paddingOnTop(wanted: MapPadding, set: Partial<MapPadding>): MapPadding {
  return {
    top: Math.max(0, wanted.top - (set.top ?? 0)),
    right: Math.max(0, wanted.right - (set.right ?? 0)),
    bottom: Math.max(0, wanted.bottom - (set.bottom ?? 0)),
    left: Math.max(0, wanted.left - (set.left ?? 0)),
  };
}

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
    case "stay":
      return null;
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
