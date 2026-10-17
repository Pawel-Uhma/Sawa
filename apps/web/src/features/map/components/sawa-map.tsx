"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Interest, PlaceSummaryFeature, Route } from "@sawa/shared";
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
import { BASEMAP_STYLE_URL, MIN_PLACE_RICHNESS, START_VIEW } from "../lib/map-style";
import { routeBounds, routePlacesToGeoJson } from "../lib/route-to-geojson";
import { selectVisiblePlaces } from "../lib/visible-places";
import { PlaceSheet, type PlaceSheetPlace } from "./place-sheet";
import { PLACES_LAYER_ID, PlacesLayer } from "./places-layer";
import { ROUTE_PLACES_LAYER_ID, RouteLayer } from "./route-layer";

const INTERACTIVE_LAYERS = [ROUTE_PLACES_LAYER_ID, PLACES_LAYER_ID];

/** Leaves room for the bottom sheet on phones when zooming to the route. */
const ROUTE_PADDING = { top: 48, right: 32, bottom: 200, left: 32 };

export type SawaMapProps = {
  /** Categories from onboarding; empty = all places. */
  interests: readonly Interest[];
  route?: Route;
};

export function SawaMap({ interests, route }: SawaMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [cursor, setCursor] = useState<string>("grab");
  const places = usePlaces();
  const { selectedId, select } = useSelectedPlace();

  const visiblePlaces = useMemo(
    () => selectVisiblePlaces(places.data ?? [], { interests, minRichness: MIN_PLACE_RICHNESS }),
    [places.data, interests],
  );

  useEffect(() => {
    const bounds = route && routeBounds(route);
    if (!isLoaded || !bounds) return;
    mapRef.current?.fitBounds(bounds, { padding: ROUTE_PADDING, duration: 800 });
  }, [route, isLoaded]);

  const selected = useMemo(
    () => findPlace(selectedId, places.data ?? [], route),
    [selectedId, places.data, route],
  );

  function handleClick(event: MapLayerMouseEvent) {
    const id = event.features?.[0]?.properties?.id;
    select(typeof id === "string" ? id : null);
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
        onLoad={() => setIsLoaded(true)}
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <AttributionControl compact customAttribution={route?.attribution} />
        <PlacesLayer places={visiblePlaces} selectedId={selectedId} isDimmed={Boolean(route)} />
        {route && <RouteLayer route={route} selectedId={selectedId} />}
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
