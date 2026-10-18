"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { LatLng, PlaceSummaryFeature, Route } from "@sawa/shared";
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
import { useTheme } from "@/features/theme";
import { useBasemapOverrides } from "../hooks/use-basemap-overrides";
import { useLiveVehicles } from "../hooks/use-live-vehicles";
import { usePlaces } from "../hooks/use-places";
import { useSelectedPlace } from "../hooks/use-selected-place";
import { registerBoardingTimers } from "../lib/boarding-timers";
import type { LngLatBounds } from "../lib/bounds";
import {
  cameraMoveKey,
  DEFAULT_MAP_PADDING,
  type MapCamera,
  type MapPadding,
  paddingWithSheet,
  resolveCamera,
} from "../lib/camera";
import { registerClusterBadges } from "../lib/cluster-badges";
import { loadMapIcons } from "../lib/map-icons";
import {
  BASEMAP_STYLE_URLS,
  basemapPaintOverrides,
  MAP_PALETTES,
  MIN_PLACE_RICHNESS,
  START_VIEW,
  WARSAW_MAX_BOUNDS,
} from "../lib/map-style";
import { isParkPlace } from "../lib/park-highlight";
import { registerPlaceStickers } from "../lib/place-stickers";
import { placeBBoxesInView } from "../lib/place-tiles";
import { routePlacesToGeoJson } from "../lib/route-to-geojson";
import { isStreetPlace } from "../lib/street-highlight";
import { selectVisiblePlaces } from "../lib/visible-places";
import { DestinationLayer } from "./destination-layer";
import { LineShapesLayer } from "./line-shapes-layer";
import { LiveVehiclesLayer } from "./live-vehicles-layer";
import { ParkLayer, type ParkSelection } from "./park-layer";
import { PlaceSheet, type PlaceSheetPlace } from "./place-sheet";
import {
  PLACES_CLUSTER_LAYER_ID,
  PLACES_LAYER_ID,
  PLACES_SOURCE_ID,
  PlacesLayer,
} from "./places-layer";
import { ROUTE_PLACES_LAYER_ID, RouteLayer } from "./route-layer";
import { StreetLayer } from "./street-layer";
import { UserLayer } from "./user-layer";

const INTERACTIVE_LAYERS = [ROUTE_PLACES_LAYER_ID, PLACES_LAYER_ID, PLACES_CLUSTER_LAYER_ID];

const CAMERA_DURATION_MS = 800;

export type SawaMapProps = {
  route?: Route;
  /** Requested view; without it the map fits the route (or stays where the user left it). */
  camera?: MapCamera;
  /** Space covered by the screen's own panels; camera moves keep their target outside it. */
  padding?: Partial<MapPadding>;
  /** User position dot. */
  user?: LatLng;
  /** Where the ride should end; drawn as a pin. */
  destination?: LatLng;
  /** Route place the story is about right now. */
  activeStopId?: string;
  /** Click on a route place. When set, it replaces the built-in place card for route places. */
  onStopClick?: (placeId: string) => void;
  /** Built-in card after clicking a place; turn off when the screen shows its own. */
  hasPlaceSheet?: boolean;
  hasZoomControls?: boolean;
  /** Click on the map outside any place (e.g. to pick a destination). */
  onMapClick?: (point: LatLng) => void;
  /** Topics the user picked; unused while places are coloured by kind group, not topic. */
  interests?: readonly string[];
};

export function SawaMap({
  route,
  camera,
  padding,
  user,
  destination,
  activeStopId,
  onStopClick,
  hasPlaceSheet = true,
  hasZoomControls = true,
  onMapClick,
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
  const attribution = useMemo(
    () => [...(route?.attribution ?? []), ...(vehicles.data?.attribution ?? [])],
    [route?.attribution, vehicles.data?.attribution],
  );
  const theme = useTheme();
  const palette = MAP_PALETTES[theme];
  const basemapOverrides = useMemo(() => basemapPaintOverrides(palette), [palette]);
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

  const fullPadding = { ...DEFAULT_MAP_PADDING, ...padding };
  const isSheetOpen = Boolean(selected);
  const move = resolveCamera(camera, route);
  // Opening or closing the card refits the view, so the route does not end up under it.
  const moveKey = `${cameraMoveKey(move, fullPadding)}|${isSheetOpen}`;

  // biome-ignore lint/correctness/useExhaustiveDependencies: moveKey holds move and padding by value; the objects themselves are new on every render
  useEffect(() => {
    const map = mapRef.current;
    if (!isLoaded || !map || !move) return;
    // MapLibre reads an explicit `zoom: undefined` / `maxZoom: undefined` as a value (camera goes NaN),
    // so optional options are only passed when set.
    const container = map.getContainer();
    const cameraPadding = isSheetOpen
      ? paddingWithSheet(fullPadding, {
          width: container.clientWidth,
          height: container.clientHeight,
        })
      : fullPadding;
    const options = { padding: cameraPadding, duration: CAMERA_DURATION_MS };
    if (move.type === "fit") {
      map.fitBounds(
        move.bounds,
        move.maxZoom === undefined ? options : { ...options, maxZoom: move.maxZoom },
      );
    } else {
      map.easeTo(
        move.zoom === undefined
          ? { ...options, center: move.center }
          : { ...options, center: move.center, zoom: move.zoom },
      );
    }
  }, [moveKey, isLoaded]);

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
        mapStyle={BASEMAP_STYLE_URLS[theme]}
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
          loadMapIcons(event.target).then((isOk) => setIcons(isOk ? "ready" : "failed"));
        }}
        onMoveEnd={(event) => setView(viewOf(event.target))}
        // The map stays flat. Two-finger pitch also hijacks a pinch that starts mid-pan and blocks the zoom.
        touchPitch={false}
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
      >
        {hasZoomControls && <NavigationControl position="top-right" showCompass={false} />}
        <AttributionControl compact customAttribution={attribution} />
        {icons !== "loading" && (
          <PlacesLayer
            places={visiblePlaces}
            theme={theme}
            selectedId={selectedId}
            isDimmed={Boolean(route)}
            hasIcons={icons === "ready"}
            palette={palette}
          />
        )}
        {icons !== "loading" && <ParkLayer selected={selectedPark} color={palette.park} />}
        {icons !== "loading" && (
          <StreetLayer selected={selectedStreet} hovered={hoveredStreet} color={palette.street} />
        )}
        {icons !== "loading" && route && <LineShapesLayer route={route} data={vehicles.data} />}
        {icons !== "loading" && route && (
          <RouteLayer
            route={route}
            selectedId={selectedId}
            activeId={activeStopId}
            hasIcons={icons === "ready"}
            knownPlaces={places.data}
            theme={theme}
            palette={palette}
          />
        )}
        {isLoaded && route && <LiveVehiclesLayer data={vehicles.data} />}
        {destination && <DestinationLayer position={destination} ring={palette.ring} />}
        {user && <UserLayer position={user} ring={palette.ring} />}
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
      {selected && <PlaceSheet key={selected.id} place={selected} onClose={() => select(null)} />}
    </div>
  );
}

type MapView = { bounds: LngLatBounds; zoom: number };

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
