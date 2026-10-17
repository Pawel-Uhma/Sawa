import { HACKATHON_VENUE, type Interest, type LatLng } from "@sawa/shared";
import { DEFAULT_MAP_PADDING, type MapCamera, type MapPadding } from "@/features/map";

export type RouteSource = "none" | "demo" | "plan";
export type CameraPreset = "auto" | "venue" | "active" | "user-and-active" | "route";
export type UserPreset = "none" | "venue" | "daszynskiego" | "bankowy";

export type PlaygroundState = {
  interests: Interest[];
  routeSource: RouteSource;
  durationMin: number;
  returnToStart: boolean;
  cameraPreset: CameraPreset;
  zoom: number;
  padding: MapPadding;
  isPaddingShown: boolean;
  userPreset: UserPreset;
  /** Index into route.places sorted by etaSec; null = no active stop. */
  activeIndex: number | null;
  hasPlaceSheet: boolean;
  hasZoomControls: boolean;
  /** Pass onStopClick (clicking a route place makes it active) instead of the built-in card. */
  isStopClickHandled: boolean;
};

export const DEFAULT_PADDING: MapPadding = DEFAULT_MAP_PADDING;

export const INITIAL_STATE: PlaygroundState = {
  interests: [],
  routeSource: "demo",
  durationMin: 60,
  returnToStart: false,
  cameraPreset: "auto",
  zoom: 16,
  padding: DEFAULT_PADDING,
  isPaddingShown: true,
  userPreset: "venue",
  activeIndex: null,
  hasPlaceSheet: true,
  hasZoomControls: true,
  isStopClickHandled: false,
};

const USER_PRESET_POSITIONS: Record<Exclude<UserPreset, "none">, LatLng> = {
  venue: HACKATHON_VENUE,
  daszynskiego: { lat: 52.2302, lng: 20.984 },
  bankowy: { lat: 52.2441, lng: 21.0005 },
};

export const USER_PRESET_OPTIONS: { value: UserPreset; label: string }[] = [
  { value: "none", label: "Brak" },
  { value: "venue", label: "42 Warsaw" },
  { value: "daszynskiego", label: "Rondo Daszyńskiego" },
  { value: "bankowy", label: "Plac Bankowy" },
];

export function userPosition(preset: UserPreset): LatLng | undefined {
  return preset === "none" ? undefined : USER_PRESET_POSITIONS[preset];
}

type CameraContext = { zoom: number; user?: LatLng; activeStop?: LatLng };

/** What each preset asks SawaMap for; undefined = no camera prop (map follows the route). */
export function cameraForPreset(preset: CameraPreset, ctx: CameraContext): MapCamera | undefined {
  switch (preset) {
    case "auto":
      return undefined;
    case "route":
      return { type: "route" };
    case "venue":
      return { type: "center", center: HACKATHON_VENUE, zoom: ctx.zoom };
    case "active":
      return ctx.activeStop
        ? { type: "center", center: ctx.activeStop, zoom: ctx.zoom }
        : undefined;
    case "user-and-active": {
      const points = [ctx.user, ctx.activeStop].filter((p): p is LatLng => p !== undefined);
      return points.length > 0 ? { type: "fit", points, maxZoom: ctx.zoom } : undefined;
    }
  }
}
