"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { type LatLng, type PlaceSummaryFeature, type Route, toLngLat } from "@sawa/shared";
import type { GeoJSONSource, Map as MapLibre } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AttributionControl,
  type MapLayerMouseEvent,
  Map as MapLibreMap,
  type MapRef,
  NavigationControl,
} from "react-map-gl/maplibre";
import { LoadingCover, StatusPill, useDelayed } from "@/components/waiting";
import { useT } from "@/features/i18n";
import { useHighContrast, useTheme } from "@/features/theme";
import { useBasemapOverrides } from "../hooks/use-basemap-overrides";
import { useBikeStations } from "../hooks/use-bike-stations";
import { useBuildings3d } from "../hooks/use-buildings-3d";
import { useLiveVehicles } from "../hooks/use-live-vehicles";
import { usePlaces } from "../hooks/use-places";
import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion";
import { useSelectedPlace } from "../hooks/use-selected-place";
import { hasBikeLeg } from "../lib/bike-stations";
import { registerBoardingTimers } from "../lib/boarding-timers";
import type { LngLatBounds } from "../lib/bounds";
import {
  cameraMoveKey,
  DEFAULT_MAP_PADDING,
  fitPadding,
  type MapCamera,
  type MapPadding,
  paddingOnTop,
  paddingWithSheet,
  resolveCamera,
} from "../lib/camera";
import { registerClusterBadges } from "../lib/cluster-badges";
import { registerLineChips } from "../lib/line-chips";
import { loadMapIcons } from "../lib/map-icons";
import {
  BASEMAP_STYLE_URLS,
  basemapPaintOverrides,
  CONTRAST_BASEMAP_OVERRIDES,
  CONTRAST_STYLE_URL,
  MAP_CONTRAST_PALETTE,
  MAP_PALETTES,
  MIN_PLACE_RICHNESS,
  START_VIEW,
  WARSAW_MAX_BOUNDS,
} from "../lib/map-style";
import { type HeadingState, NAV_ZOOM, NO_HEADING, nextHeading, PITCH_3D } from "../lib/navigation";
import { registerNavigationImages } from "../lib/navigation-images";
import { isParkPlace } from "../lib/park-highlight";
import { registerPlaceStickers } from "../lib/place-stickers";
import { placeBBoxesInView } from "../lib/place-tiles";
import { routePlacesToGeoJson } from "../lib/route-to-geojson";
import { isStreetPlace } from "../lib/street-highlight";
import { selectVisiblePlaces } from "../lib/visible-places";
import { BikePathsLayer, bikePathsBeforeId } from "./bike-paths-layer";
import { BikeStationsLayer } from "./bike-stations-layer";
import { DestinationLayer } from "./destination-layer";
import { LineShapesLayer } from "./line-shapes-layer";
import { LiveVehiclesLayer } from "./live-vehicles-layer";
import { LocateButton, type LocateProps } from "./locate-button";
import { ParkLayer, type ParkSelection } from "./park-layer";
import { PlaceSheet, type PlaceSheetPlace } from "./place-sheet";
import {
  PLACES_CLUSTER_LAYER_ID,
  PLACES_LAYER_ID,
  PLACES_SOURCE_ID,
  PlacesLayer,
} from "./places-layer";
import { ROUTE_BOARDING_LAYER_IDS, ROUTE_PLACES_LAYER_ID, RouteLayer } from "./route-layer";
import { StreetLayer } from "./street-layer";
import { UserLayer } from "./user-layer";
import { ViewToggle } from "./view-toggle";
import { WaypointsLayer } from "./waypoints-layer";

const INTERACTIVE_LAYERS = [
  ROUTE_PLACES_LAYER_ID,
  PLACES_LAYER_ID,
  PLACES_CLUSTER_LAYER_ID,
  ...ROUTE_BOARDING_LAYER_IDS,
];

const CAMERA_DURATION_MS = 800;

/** Zoom the "back to me" button goes to at least. */
const LOCATE_ZOOM = 15.5;

/** The 2D / 3D choice stays on this device (a convenience, so it may be missing). */
const VIEW_3D_KEY = "sawa.map3d";

export type SawaMapProps = {
  route?: Route;
  /** Requested view; without it the map fits the route (or stays where the user left it). */
  camera?: MapCamera;
  /** Space covered by the screen's own panels; camera moves keep their target outside it. */
  padding?: Partial<MapPadding>;
  /** User position dot. */
  user?: LatLng;
  /** GPS course in degrees from north (`coords.heading`); without it the heading comes from movement. */
  userHeading?: number | null;
  /**
   * A ride is on (#193): when it turns on with the dot known, the camera eases to the dot at
   * NAV_ZOOM and follows it, turned the way the user moves (tilted in 3D), and an arrow along
   * the route points to the next place. A drag ends following, the "back to me" button resumes it.
   */
  navigate?: boolean;
  /** 2D / 3D switch above the "back to me" button (#199). */
  hasViewToggle?: boolean;
  /** Where the ride should end; drawn as a pin. */
  destination?: LatLng;
  /** Stops on the way, in order; drawn as numbered pins (issue #195). */
  waypoints?: readonly (LatLng & { name?: string })[];
  /** Route place the story is about right now. */
  activeStopId?: string;
  /** Legs picked in the "Dojazd" list (`highlightedLegs`): drawn on top, the rest faded. */
  highlightLegs?: readonly number[] | null;
  /** The user picked a line: regular place icons fade further, so the line reads clearly. */
  fadePlaces?: boolean;
  /** Planning or riding by bike: bike paths from the basemap are drawn. */
  showBikePaths?: boolean;
  /** Click on a route place. When set, it replaces the built-in place card for route places. */
  onStopClick?: (placeId: string) => void;
  /** Click on a boarding ring or its line label: the leg boarded there and, at a transfer, the leg left (-1 at the start). */
  onBoardingClick?: (legIndex: number, fromLegIndex: number) => void;
  /** Built-in card after clicking a place; turn off when the screen shows its own. */
  hasPlaceSheet?: boolean;
  hasZoomControls?: boolean;
  /** Click on the map outside any place (e.g. to pick a destination). */
  onMapClick?: (point: LatLng) => void;
  /** Topics the user picked; unused while places are coloured by kind group, not topic. */
  interests?: readonly string[];
  /**
   * "Back to me" button in the bottom right corner. While it follows the dot, screen camera
   * moves wait; a drag or a new `followResetKey` (e.g. the user picked a place) ends following.
   */
  locate?: LocateProps & { followResetKey?: string; bottomPx?: number };
};

export function SawaMap({
  route,
  camera,
  padding,
  user,
  userHeading,
  navigate = false,
  hasViewToggle = true,
  destination,
  waypoints,
  activeStopId,
  highlightLegs = null,
  fadePlaces = false,
  showBikePaths = false,
  onStopClick,
  onBoardingClick,
  hasPlaceSheet = true,
  hasZoomControls = true,
  onMapClick,
  locate,
}: SawaMapProps) {
  const t = useT();
  const mapRef = useRef<MapRef>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  // Layers mount only after the icons are in the style, so they keep their stacking order.
  const [icons, setIcons] = useState<"loading" | "ready" | "failed">("loading");
  const [cursor, setCursor] = useState<string>("grab");
  // Street under the mouse; only on devices that hover, a tap would leave it lit.
  const [hoveredStreet, setHoveredStreet] = useState<string | null>(null);
  const [view, setView] = useState<MapView | null>(null);
  const bboxes = useMemo(() => (view ? placeBBoxesInView(view.bounds, view.zoom) : []), [view]);
  const places = usePlaces(bboxes);
  // Miejsca dociągają się kafelkami przy każdym przesunięciu; pigułka tylko, gdy trwa to dłużej
  const isFindingPlaces = useDelayed(isLoaded && places.isPending, 700);
  const vehicles = useLiveVehicles(route);
  // Veturilo stations only on a bike route (#192)
  const isBikeRoute = hasBikeLeg(route);
  const bikeStations = useBikeStations(isBikeRoute);
  const attribution = useMemo(
    () => [
      ...new Set([
        ...(route?.attribution ?? []),
        ...(vehicles.data?.attribution ?? []),
        ...(isBikeRoute ? (bikeStations.data?.attribution ?? []) : []),
      ]),
    ],
    [route?.attribution, vehicles.data?.attribution, isBikeRoute, bikeStations.data?.attribution],
  );
  const theme = useTheme();
  // High contrast always resolves to the dark theme (features/theme) and repaints it black and yellow.
  const isHighContrast = useHighContrast();
  const palette = isHighContrast ? MAP_CONTRAST_PALETTE : MAP_PALETTES[theme];
  const basemapOverrides = useMemo(
    () => [
      ...basemapPaintOverrides(palette),
      ...(isHighContrast ? CONTRAST_BASEMAP_OVERRIDES : []),
    ],
    [palette, isHighContrast],
  );
  useBasemapOverrides(mapRef, isLoaded, basemapOverrides);
  const { selectedId, select } = useSelectedPlace();

  const visiblePlaces = useMemo(
    () => selectVisiblePlaces(places.data, { minRichness: MIN_PLACE_RICHNESS }),
    [places.data],
  );

  const selected = useMemo(
    () => (hasPlaceSheet ? findPlace(selectedId, places.data, route) : null),
    [hasPlaceSheet, selectedId, places.data, route],
  );

  const selectedSummary = useMemo(
    () => places.data.find((p) => p.properties.id === selectedId),
    [selectedId, places.data],
  );
  const selectedStreet =
    selectedSummary && isStreetPlace(selectedSummary.properties)
      ? selectedSummary.properties.name
      : null;
  const selectedPark = useMemo<ParkSelection | null>(
    () =>
      selectedSummary && isParkPlace(selectedSummary.properties)
        ? { name: selectedSummary.properties.name, lngLat: selectedSummary.geometry.coordinates }
        : null,
    [selectedSummary],
  );

  const isReducedMotion = usePrefersReducedMotion();
  // Reduced motion: the camera jumps instead of flying, and the 3D tilt is not animated
  const duration = isReducedMotion ? 0 : CAMERA_DURATION_MS;
  const [is3d, setIs3d] = useState(false);
  useEffect(() => setIs3d(loadIs3d()), []);
  const pitch = is3d ? PITCH_3D : 0;
  useBuildings3d(mapRef, isLoaded, is3d, palette.buildings);

  const isNavigating = navigate && Boolean(user);
  const navigatingRef = useRef(false);
  navigatingRef.current = isNavigating;
  const headingRef = useRef<HeadingState>(NO_HEADING);
  const [heading, setHeading] = useState<number | null>(null);
  // Zoom the camera is easing to: a GPS fix mid-flight must not stop the zoom halfway
  const targetZoomRef = useRef<number | null>(null);

  const fullPadding = { ...DEFAULT_MAP_PADDING, ...padding };
  const isSheetOpen = Boolean(selected);
  const move = resolveCamera(camera, route);
  // Opening or closing the card refits the view, so the route does not end up under it.
  const moveKey = `${cameraMoveKey(move, fullPadding)}|${isSheetOpen}`;
  const [isFollowing, setIsFollowing] = useState(false);
  const followRef = useRef(false);
  followRef.current = isFollowing && Boolean(user);
  const [mapHeight, setMapHeight] = useState(0);

  function cameraPaddingOf(map: MapRef): MapPadding {
    const container = map.getContainer();
    const size = { width: container.clientWidth, height: container.clientHeight };
    return fitPadding(isSheetOpen ? paddingWithSheet(fullPadding, size) : fullPadding, size);
  }

  function easeToUser({
    zoom: exactZoom,
    zoomAtLeast,
  }: {
    zoom?: number;
    zoomAtLeast?: number;
  } = {}) {
    const map = mapRef.current;
    if (!map || !user) return;
    const current = targetZoomRef.current ?? map.getZoom();
    const zoom =
      exactZoom ?? (zoomAtLeast === undefined ? current : Math.max(current, zoomAtLeast));
    // On a ride the map turns the way the user moves; without a heading yet it keeps its bearing
    const bearing = navigatingRef.current ? headingRef.current.heading : null;
    map.easeTo({
      center: toLngLat(user),
      zoom,
      pitch,
      ...(bearing === null ? {} : { bearing }),
      padding: cameraPaddingOf(map),
      duration,
    });
    targetZoomRef.current = duration > 0 ? zoom : null;
  }

  // A choice the user made on screen (a place, a stop) wins over following the dot.
  // Runs before the camera effect, so that move is not skipped.
  const followResetKey = locate?.followResetKey;
  // biome-ignore lint/correctness/useExhaustiveDependencies: only a new key ends following
  useEffect(() => {
    followRef.current = false;
    setIsFollowing(false);
  }, [followResetKey]);

  // A ride that starts (or the dot found once it has started) moves the camera to the user.
  // Runs before the camera effect, which then only keeps following.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only the start of a ride starts following
  useEffect(() => {
    if (!isLoaded || !isNavigating) return;
    followRef.current = true;
    setIsFollowing(true);
    easeToUser({ zoom: NAV_ZOOM });
  }, [isNavigating, isLoaded]);

  // Heading before following, so a fix turns the map the way the user just moved
  // biome-ignore lint/correctness/useExhaustiveDependencies: by value, not by object
  useEffect(() => {
    headingRef.current = user
      ? nextHeading(headingRef.current, toLngLat(user), userHeading)
      : NO_HEADING;
    setHeading(headingRef.current.heading);
  }, [user?.lat, user?.lng, userHeading]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: follows the dot by value, not by object
  useEffect(() => {
    if (isLoaded && followRef.current) easeToUser();
  }, [user?.lat, user?.lng, isLoaded]);

  // The 2D / 3D switch tilts the camera; back to 2D also turns north up again (no compass on phones)
  // biome-ignore lint/correctness/useExhaustiveDependencies: only a new choice tilts the camera
  useEffect(() => {
    const map = mapRef.current;
    if (!isLoaded || !map) return;
    if (followRef.current) {
      easeToUser();
      return;
    }
    map.easeTo(is3d ? { pitch, duration } : { pitch, bearing: 0, duration });
  }, [is3d, isLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!isLoaded || !map) return;
    const container = map.getContainer();
    const measure = () => setMapHeight(container.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [isLoaded]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: moveKey holds move and padding by value; the objects themselves are new on every render
  useEffect(() => {
    const map = mapRef.current;
    if (!isLoaded || !map) return;
    // Following: the screen's own move waits, a new padding only shifts the dot
    if (followRef.current) {
      easeToUser();
      return;
    }
    if (!move) return;
    // MapLibre reads an explicit `zoom: undefined` / `maxZoom: undefined` as a value (camera goes NaN),
    // so optional options are only passed when set.
    // Screen moves turn north up again: on a phone there is no compass to do it
    const options = { padding: cameraPaddingOf(map), duration, pitch, bearing: 0 };
    if (move.type === "fit") {
      const fit = { ...options, padding: paddingOnTop(options.padding, map.getPadding()) };
      map.fitBounds(
        move.bounds,
        move.maxZoom === undefined ? fit : { ...fit, maxZoom: move.maxZoom },
      );
    } else {
      map.easeTo(
        move.zoom === undefined
          ? { ...options, center: move.center }
          : { ...options, center: move.center, zoom: move.zoom },
      );
    }
  }, [moveKey, isLoaded]);

  const showLocate = Boolean(locate && (user || locate.status !== "found"));
  const viewToggle = hasViewToggle ? (
    <ViewToggle
      is3d={is3d}
      onToggle={() => {
        setIs3d(!is3d);
        saveIs3d(!is3d);
      }}
    />
  ) : null;

  function handleMouseMove(event: MapLayerMouseEvent) {
    if (!window.matchMedia("(hover: hover)").matches) return;
    const props = event.features?.[0]?.properties;
    setHoveredStreet(props && isStreetPlace(props) ? (props.name as string) : null);
  }

  function handleClick(event: MapLayerMouseEvent) {
    const feature = event.features?.[0];
    if (feature?.layer.id === PLACES_CLUSTER_LAYER_ID) {
      const center = feature.geometry.type === "Point" ? feature.geometry.coordinates : null;
      expandCluster(event.target, feature.properties?.cluster_id, center ?? event.lngLat.toArray());
      return;
    }
    if (feature && ROUTE_BOARDING_LAYER_IDS.includes(feature.layer.id) && onBoardingClick) {
      onBoardingClick(
        Number(feature.properties?.legIndex),
        Number(feature.properties?.fromLegIndex),
      );
      return;
    }
    const id = feature?.properties?.id;
    if (typeof id !== "string") {
      select(null);
      onMapClick?.({ lat: event.lngLat.lat, lng: event.lngLat.lng });
      return;
    }
    if (feature?.layer.id === ROUTE_PLACES_LAYER_ID && onStopClick) {
      onStopClick(id);
      return;
    }
    select(id);
  }

  return (
    <div className="motyw relative h-full w-full">
      <MapLibreMap
        ref={mapRef}
        initialViewState={START_VIEW}
        maxBounds={WARSAW_MAX_BOUNDS}
        mapStyle={isHighContrast ? CONTRAST_STYLE_URL : BASEMAP_STYLE_URLS[theme]}
        interactiveLayerIds={INTERACTIVE_LAYERS}
        cursor={cursor}
        onMouseEnter={() => setCursor("pointer")}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setCursor("grab");
          setHoveredStreet(null);
        }}
        onClick={handleClick}
        onLoad={(event) => {
          // Compact attribution starts expanded and covers the bottom of a phone screen;
          // collapse it, the (i) button still opens it.
          event.target
            .getContainer()
            .querySelector(".maplibregl-ctrl-attrib")
            ?.classList.remove("maplibregl-compact-show");
          setView(viewOf(event.target));
          setIsLoaded(true);
          // Place markers are drawn on demand; the map lives as long as this listener.
          registerPlaceStickers(event.target);
          registerClusterBadges(event.target);
          registerBoardingTimers(event.target);
          registerLineChips(event.target);
          registerNavigationImages(event.target);
          loadMapIcons(event.target).then((isOk) => setIcons(isOk ? "ready" : "failed"));
        }}
        onMoveEnd={(event) => {
          targetZoomRef.current = null;
          setView(viewOf(event.target));
        }}
        // A pinch while following keeps following, but at the zoom the user chose
        onZoomStart={(event) => {
          if (event.originalEvent) targetZoomRef.current = null;
        }}
        onDragStart={() => setIsFollowing(false)}
        // The map stays flat. Two-finger pitch also hijacks a pinch that starts mid-pan and blocks the zoom.
        touchPitch={false}
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
      >
        {hasZoomControls && <NavigationControl position="top-right" showCompass={false} />}
        <AttributionControl compact customAttribution={attribution} />
        {icons !== "loading" && <ParkLayer selected={selectedPark} color={palette.park} />}
        {isLoaded && showBikePaths && (
          <BikePathsLayer
            color={palette.bikePath}
            beforeId={bikePathsBeforeId(mapRef.current?.getStyle()?.layers)}
          />
        )}
        {icons !== "loading" && (
          <StreetLayer selected={selectedStreet} hovered={hoveredStreet} color={palette.street} />
        )}
        {icons !== "loading" && (
          <PlacesLayer
            places={visiblePlaces}
            theme={isHighContrast ? "contrast" : theme}
            selectedId={selectedId}
            isDimmed={Boolean(route)}
            isFaint={Boolean(route) && fadePlaces}
            hasIcons={icons === "ready"}
            palette={palette}
          />
        )}
        {icons !== "loading" && route && (
          <LineShapesLayer route={route} data={vehicles.data} highlightLegs={highlightLegs} />
        )}
        {icons !== "loading" && route && (
          <RouteLayer
            route={route}
            selectedId={selectedId}
            activeId={activeStopId}
            highlightLegs={highlightLegs}
            isPicked={fadePlaces}
            hasIcons={icons === "ready"}
            knownPlaces={places.data}
            theme={theme}
            stickerLook={isHighContrast ? "contrast" : theme}
            palette={palette}
          />
        )}
        {icons !== "loading" && route && isBikeRoute && (
          <BikeStationsLayer
            route={route}
            stations={bikeStations.data?.stations ?? []}
            palette={palette}
          />
        )}
        {isLoaded && route && <LiveVehiclesLayer data={vehicles.data} />}
        {destination && <DestinationLayer position={destination} ring={palette.ring} />}
        {waypoints && waypoints.length > 0 && <WaypointsLayer points={waypoints} />}
        {user && <UserLayer position={user} ring={palette.ring} heading={heading} />}
      </MapLibreMap>
      <LoadingCover
        show={!isLoaded}
        label={t("Wczytuję mapę Warszawy…", "Loading the map of Warsaw…")}
      />
      {/* Stan miejsc w pigułce u góry, pośrodku: nie zasłania logo ani paneli */}
      <div className="pointer-events-none absolute inset-x-0 top-[max(1.25rem,env(safe-area-inset-top))] z-[15] flex justify-center md:top-6">
        <StatusPill
          icon={
            places.isError ? <span className="size-2 shrink-0 rounded-full bg-koral" /> : undefined
          }
          action={
            places.isError && (
              <button
                type="button"
                className="-mr-1 shrink-0 rounded-full px-1.5 font-bold text-glebia underline-offset-2 hover:underline"
                onClick={() => places.refetch()}
              >
                {t("Ponów", "Retry")}
              </button>
            )
          }
        >
          {places.isError
            ? t("Nie wczytałam miejsc", "Places didn't load")
            : isFindingPlaces
              ? t("Szukam miejsc w okolicy…", "Finding places nearby…")
              : null}
        </StatusPill>
      </div>
      {/* Bez kropki (start spod 42 Warsaw, gdy jesteś poza Warszawą) nie ma do czego wracać */}
      {showLocate && locate && (
        <LocateButton
          status={locate.status}
          onRetry={locate.onRetry}
          isFollowing={followRef.current}
          onLocate={() => {
            followRef.current = true;
            setIsFollowing(true);
            // On a ride back to the riding view, otherwise just close enough to see the dot
            easeToUser(isNavigating ? { zoom: NAV_ZOOM } : { zoomAtLeast: LOCATE_ZOOM });
          }}
          bottomPx={(locate.bottomPx ?? fullPadding.bottom) + 12}
          rightPx={Math.max(fullPadding.right, 16)}
          mapHeightPx={mapHeight}
          above={viewToggle}
        />
      )}
      {!showLocate && viewToggle && (
        <div
          className="absolute z-[15]"
          style={{ bottom: fullPadding.bottom + 12, right: Math.max(fullPadding.right, 16) }}
        >
          {viewToggle}
        </div>
      )}
      {selected && <PlaceSheet key={selected.id} place={selected} onClose={() => select(null)} />}
    </div>
  );
}

type MapView = { bounds: LngLatBounds; zoom: number };

function loadIs3d(): boolean {
  try {
    return window.localStorage.getItem(VIEW_3D_KEY) === "1";
  } catch {
    return false;
  }
}

function saveIs3d(is3d: boolean) {
  try {
    window.localStorage.setItem(VIEW_3D_KEY, is3d ? "1" : "0");
  } catch {
    // Private mode or blocked storage: the choice lasts until the page closes
  }
}

/**
 * Zooms in on a cluster just far enough for it to split.
 * MapLibre skips the animation itself under reduced motion.
 */
async function expandCluster(map: MapLibre, clusterId: unknown, center: number[]) {
  const source = map.getSource<GeoJSONSource>(PLACES_SOURCE_ID);
  if (typeof clusterId !== "number" || !source || center.length < 2) return;
  const zoom = await source.getClusterExpansionZoom(clusterId);
  map.easeTo({ center: [center[0], center[1]], zoom, duration: CAMERA_DURATION_MS });
}

function viewOf(map: MapLibre): MapView {
  const bounds = map.getBounds();
  return {
    bounds: [
      [bounds.getWest(), bounds.getSouth()],
      [bounds.getEast(), bounds.getNorth()],
    ],
    zoom: map.getZoom(),
  };
}

/**
 * Summary for the card. The place may sit in a tile that is out of view (panned away, or opened
 * from a `?p=` link), then the card shows the name once the detail loads.
 */
function findPlace(
  id: string | null,
  places: PlaceSummaryFeature[],
  route: Route | undefined,
): PlaceSheetPlace | null {
  if (!id) return null;
  const onRoute = route && routePlacesToGeoJson(route).features.find((f) => f.properties.id === id);
  const summary = places.find((p) => p.properties.id === id)?.properties;
  return {
    id,
    name: summary?.name ?? onRoute?.properties.name,
    kind: summary?.kind,
    subkind: summary?.subkind,
    tags: summary?.interests,
    order: onRoute?.properties.order,
  };
}
