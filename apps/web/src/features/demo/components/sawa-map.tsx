"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../lib/device";
import type { LngLat } from "../lib/mock-data";

// Darmowe kafelki bez tokenu. Docelowy dostawca mapy jest w otwartych decyzjach (stan.md).
const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

// Paleta jak w makietach (docs/ui/propozycje/html/_mapa.js)
const COLORS = {
  background: "#EEF3F0",
  park: "#D6EEE2",
  water: "#B9E2D3",
  residential: "#E9EEEB",
  building: "#E1E8E4",
  buildingOutline: "#D7DFDB",
  road: "#FFFFFF",
  roadMinor: "#FAFCFB",
  casing: "#D9E1DD",
  rail: "#CFD8D4",
  text: "#5B706D",
  halo: "#EEF3F0",
};

export type MapPin = { id: string; name: string; coord: LngLat };
export type MapStop = { id: string; coord: LngLat; label: string; isActive: boolean };
export type MapPadding = { top: number; right: number; bottom: number; left: number };
export type MapCamera =
  | { kind: "center"; coord: LngLat; zoom: number }
  | { kind: "fit"; coords: LngLat[] };

type SawaMapProps = {
  user: LngLat;
  camera: MapCamera;
  padding: MapPadding;
  pins?: MapPin[];
  stops?: MapStop[];
  route?: LngLat[] | null;
  onStopClick?: (id: string) => void;
};

type PaintProperty = Parameters<MapLibreMap["setPaintProperty"]>[1];
type RouteData = Parameters<GeoJSONSource["setData"]>[0];

function recolor(map: MapLibreMap) {
  for (const layer of map.getStyle().layers) {
    const { id, type } = layer;
    const paint = (property: PaintProperty, value: string) => {
      try {
        map.setPaintProperty(id, property, value);
      } catch {
        // Warstwa bez tej właściwości: pomijamy.
      }
    };
    if (type === "background") paint("background-color", COLORS.background);
    else if (id === "park" || id.includes("wood")) paint("fill-color", COLORS.park);
    else if (id === "water") paint("fill-color", COLORS.water);
    else if (id === "waterway") paint("line-color", COLORS.water);
    else if (id.includes("residential")) paint("fill-color", COLORS.residential);
    else if (id === "building") {
      paint("fill-color", COLORS.building);
      paint("fill-outline-color", COLORS.buildingOutline);
    } else if (id.includes("casing")) paint("line-color", COLORS.casing);
    else if (id.includes("minor") || id.includes("path")) paint("line-color", COLORS.roadMinor);
    else if (id.startsWith("highway") || id.startsWith("tunnel")) paint("line-color", COLORS.road);
    else if (id.startsWith("railway"))
      paint("line-color", id.includes("dash") ? COLORS.background : COLORS.rail);
    else if (
      id.startsWith("boundary") ||
      id.startsWith("label_city") ||
      id.startsWith("label_country") ||
      id === "label_state"
    )
      map.setLayoutProperty(id, "visibility", "none");
    else if (type === "symbol") {
      paint("text-color", COLORS.text);
      paint("text-halo-color", COLORS.halo);
    }
  }
}

function routeData(route: LngLat[] | null | undefined): RouteData {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: route ?? [] },
  };
}

function boundsOf(coords: LngLat[]): [LngLat, LngLat] {
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

/** Element markera: zewnętrzny div pozycjonuje MapLibre, wewnętrzny animujemy sami. */
function markerElement(className: string, html: string) {
  const outer = document.createElement("div");
  const inner = document.createElement("div");
  inner.className = className;
  inner.innerHTML = html;
  outer.appendChild(inner);
  return { outer, inner };
}

export function SawaMap({
  user,
  camera,
  padding,
  pins = [],
  stops = [],
  route = null,
  onStopClick,
}: SawaMapProps) {
  const containerRef = useRef<HTMLElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerClassRef = useRef<typeof Marker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const onStopClickRef = useRef(onStopClick);
  onStopClickRef.current = onStopClick;

  // Jedna instancja mapy na całe życie aplikacji: ekrany zmieniają tylko kamerę i warstwy.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pozycja startowa tylko przy montowaniu
  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;

    import("maplibre-gl").then(({ Map: MapClass, Marker: MarkerClass }) => {
      if (cancelled || !containerRef.current) return;
      markerClassRef.current = MarkerClass;
      map = new MapClass({
        container: containerRef.current,
        style: STYLE_URL,
        center: user,
        zoom: 14.6,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
        fadeDuration: 0,
      });
      map.touchZoomRotate.disableRotation();
      map.keyboard.disableRotation();

      map.on("load", () => {
        if (!map) return;
        recolor(map);
        map.addSource("route", { type: "geojson", data: routeData(null) });
        map.addLayer({
          id: "route-casing",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#FFFFFF", "line-width": 11 },
        });
        map.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#17706F", "line-width": 6 },
        });

        const { outer } = markerElement("mapa-ja", "");
        new MarkerClass({ element: outer }).setLngLat(user).addTo(map);

        mapRef.current = map;
        setIsReady(true);
      });
    });

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  // Trasa
  // biome-ignore lint/correctness/useExhaustiveDependencies: isReady ponawia efekt po załadowaniu mapy
  useEffect(() => {
    const source = mapRef.current?.getSource("route") as GeoJSONSource | undefined;
    source?.setData(routeData(route));
  }, [route, isReady]);

  // Podpisane miejsca (ekran główny)
  // biome-ignore lint/correctness/useExhaustiveDependencies: isReady ponawia efekt po załadowaniu mapy
  useEffect(() => {
    const map = mapRef.current;
    const MarkerClass = markerClassRef.current;
    if (!map || !MarkerClass) return;
    const markers = pins.map((pin, index) => {
      const { outer, inner } = markerElement("mapa-pin", "<b></b><span></span>");
      const label = inner.querySelector("span");
      if (label) label.textContent = pin.name;
      inner.style.animationDelay = `${120 + index * 70}ms`;
      return new MarkerClass({ element: outer, anchor: "left", offset: [-15, 0] })
        .setLngLat(pin.coord)
        .addTo(map);
    });
    return () => {
      for (const marker of markers) marker.remove();
    };
  }, [pins, isReady]);

  // Numerowane punkty trasy
  const stopMarkersRef = useRef(new Map<string, { marker: Marker; inner: HTMLElement }>());
  const stopsKey = stops.map((stop) => stop.id).join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: markery odtwarzamy tylko, gdy zmienia się zestaw punktów
  useEffect(() => {
    const map = mapRef.current;
    const MarkerClass = markerClassRef.current;
    if (!map || !MarkerClass) return;
    const created = stopMarkersRef.current;
    stops.forEach((stop, index) => {
      const { outer, inner } = markerElement("mapa-nr", "");
      inner.textContent = stop.label;
      inner.style.animationDelay = `${200 + index * 60}ms`;
      inner.setAttribute("role", "button");
      inner.setAttribute("aria-label", `Punkt ${stop.label}`);
      outer.addEventListener("click", () => onStopClickRef.current?.(stop.id));
      const marker = new MarkerClass({ element: outer }).setLngLat(stop.coord).addTo(map);
      created.set(stop.id, { marker, inner });
    });
    return () => {
      for (const { marker } of created.values()) marker.remove();
      created.clear();
    };
  }, [stopsKey, isReady]);

  // Aktywny punkt: tylko klasa, bez odtwarzania markerów
  useEffect(() => {
    for (const stop of stops) {
      const entry = stopMarkersRef.current.get(stop.id);
      entry?.inner.classList.toggle("aktywny", stop.isActive);
      if (entry && stop.isActive) entry.marker.getElement().style.zIndex = "2";
      else if (entry) entry.marker.getElement().style.zIndex = "1";
    }
  }, [stops]);

  // Kamera: zawsze od bieżącego widoku, z marginesem na panel lub arkusz
  const cameraKey = JSON.stringify(camera);
  const paddingKey = JSON.stringify(padding);
  // biome-ignore lint/correctness/useExhaustiveDependencies: porównujemy po wartości
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const duration = reducedMotion ? 0 : 900;
    if (camera.kind === "fit" && camera.coords.length > 1) {
      map.fitBounds(boundsOf(camera.coords), {
        padding: {
          top: padding.top + 24,
          right: padding.right + 24,
          bottom: padding.bottom + 24,
          left: padding.left + 24,
        },
        maxZoom: 15.5,
        duration,
      });
    } else if (camera.kind === "center") {
      map.easeTo({ center: camera.coord, zoom: camera.zoom, padding, duration });
    }
  }, [cameraKey, paddingKey, isReady, reducedMotion]);

  return (
    <section
      ref={containerRef}
      className="absolute inset-0 bg-[#EEF3F0]"
      aria-label="Mapa Warszawy z trasą"
    />
  );
}
