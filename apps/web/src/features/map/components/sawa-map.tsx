"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Interest, LatLng, PlaceSummaryFeature, Route } from "@sawa/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AttributionControl,
  type MapLayerMouseEvent,
  Map as MapLibreMap,
  type MapRef,
  NavigationControl,
} from "react-map-gl/maplibre";
import { usePlaces } from "../hooks/use-places";
import { useSelectedPlace } from "../hooks/use-selected-place";
import {
  cameraMoveKey,
  DEFAULT_MAP_PADDING,
  type MapCamera,
  type MapPadding,
  resolveCamera,
} from "../lib/camera";
import { BASEMAP_STYLE_URL, MIN_PLACE_RICHNESS, START_VIEW } from "../lib/map-style";
import { routePlacesToGeoJson } from "../lib/route-to-geojson";
import { selectVisiblePlaces } from "../lib/visible-places";
import { DestinationLayer } from "./destination-layer";
import { PlaceSheet, type PlaceSheetPlace } from "./place-sheet";
import { PLACES_LAYER_ID, PlacesLayer } from "./places-layer";
import { ROUTE_PLACES_LAYER_ID, RouteLayer } from "./route-layer";
import { UserLayer } from "./user-layer";

const INTERACTIVE_LAYERS = [ROUTE_PLACES_LAYER_ID, PLACES_LAYER_ID];

const CAMERA_DURATION_MS = 800;

export type SawaMapProps = {
  /** Categories from onboarding; empty = all places. */
  interests: readonly Interest[];
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
};

export function SawaMap({
  interests,
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
  const mapRef = useRef<MapRef>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [cursor, setCursor] = useState<string>("grab");
  const places = usePlaces();
  const { selectedId, select } = useSelectedPlace();

  const visiblePlaces = useMemo(
    () => selectVisiblePlaces(places.data ?? [], { interests, minRichness: MIN_PLACE_RICHNESS }),
    [places.data, interests],
  );

  const fullPadding = { ...DEFAULT_MAP_PADDING, ...padding };
  const move = resolveCamera(camera, route);
  const moveKey = cameraMoveKey(move, fullPadding);

  // biome-ignore lint/correctness/useExhaustiveDependencies: moveKey holds move and padding by value; the objects themselves are new on every render
  useEffect(() => {
    const map = mapRef.current;
    if (!isLoaded || !map || !move) return;
    // MapLibre reads an explicit `zoom: undefined` / `maxZoom: undefined` as a value (camera goes NaN),
    // so optional options are only passed when set.
    const options = { padding: fullPadding, duration: CAMERA_DURATION_MS };
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

  const selected = useMemo(
    () => (hasPlaceSheet ? findPlace(selectedId, places.data ?? [], route) : null),
    [hasPlaceSheet, selectedId, places.data, route],
  );

  function handleClick(event: MapLayerMouseEvent) {
    const feature = event.features?.[0];
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
    <div className="relative h-full w-full">
      <MapLibreMap
        ref={mapRef}
        initialViewState={START_VIEW}
        mapStyle={BASEMAP_STYLE_URL}
        interactiveLayerIds={INTERACTIVE_LAYERS}
        cursor={cursor}
        onMouseEnter={() => setCursor("pointer")}
        onMouseLeave={() => setCursor("grab")}
        onClick={handleClick}
        onLoad={(event) => {
          // Compact attribution starts expanded and covers the bottom of a phone screen;
          // collapse it, the (i) button still opens it.
          event.target
            .getContainer()
            .querySelector(".maplibregl-ctrl-attrib")
            ?.classList.remove("maplibregl-compact-show");
          setIsLoaded(true);
        }}
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
      >
        {hasZoomControls && <NavigationControl position="top-right" showCompass={false} />}
        <AttributionControl compact customAttribution={route?.attribution} />
        <PlacesLayer places={visiblePlaces} selectedId={selectedId} isDimmed={Boolean(route)} />
        {route && <RouteLayer route={route} selectedId={selectedId} activeId={activeStopId} />}
        {destination && <DestinationLayer position={destination} />}
        {user && <UserLayer position={user} />}
      </MapLibreMap>
      {places.isError && (
        <p className="absolute inset-x-4 top-4 z-10 rounded-lg bg-white px-3 py-2 text-sm text-red-700 shadow">
          Nie udało się pobrać miejsc.{" "}
          <button type="button" className="font-medium underline" onClick={() => places.refetch()}>
            Spróbuj ponownie
          </button>
        </p>
      )}
      {selected && <PlaceSheet key={selected.id} place={selected} onClose={() => select(null)} />}
    </div>
  );
}

function findPlace(
  id: string | null,
  places: PlaceSummaryFeature[],
  route: Route | undefined,
): PlaceSheetPlace | null {
  if (!id) return null;
  const onRoute = route && routePlacesToGeoJson(route).features.find((f) => f.properties.id === id);
  const summary = places.find((p) => p.properties.id === id)?.properties;
  if (!summary && !onRoute) return null;
  return {
    id,
    name: summary?.name ?? onRoute?.properties.name ?? id,
    kind: summary?.kind,
    tags: summary?.interests,
    order: onRoute?.properties.order,
  };
}
