import type { Route } from "@sawa/shared";
import type { ExpressionSpecification } from "maplibre-gl";
import { useEffect, useMemo, useState } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import { useLang } from "@/features/i18n";
import { BOARDING_TIMER_IMAGE, boardingTimerId, countdownOf } from "../lib/boarding-timers";
import { ACTIVE_STOP_COLOR, LABEL_FONT, type MapPalette, type MapTheme } from "../lib/map-style";
import {
  routeBoardingsToGeoJson,
  routeLegsToGeoJson,
  routePlacesToGeoJson,
  routeWalksToGeoJson,
} from "../lib/route-to-geojson";

export const ROUTE_PLACES_LAYER_ID = "route-places-circle";

type RouteLayerProps = {
  route: Route;
  selectedId: string | null;
  /** Place the story is about right now; drawn larger and in the accent colour. */
  activeId?: string;
  theme: MapTheme;
  palette: MapPalette;
};

/** How often the countdown at boarding stops is redrawn. */
const COUNTDOWN_TICK_MS = 15_000;

export function RouteLayer({ route, selectedId, activeId, theme, palette }: RouteLayerProps) {
  const lang = useLang();
  const isActive: ExpressionSpecification = ["==", ["get", "id"], activeId ?? ""];
  const legs = useMemo(() => routeLegsToGeoJson(route), [route]);
  const places = useMemo(() => routePlacesToGeoJson(route), [route]);
  const now = useNow(COUNTDOWN_TICK_MS);
  // Each boarding gets its countdown ring image and, while it counts minutes, the clock time below.
  const boardings = useMemo(() => {
    const collection = routeBoardingsToGeoJson(route);
    return {
      ...collection,
      features: collection.features.map((feature) => {
        const { color, clock, departAtMs, walkMin, boardAt } = feature.properties;
        const countdown = countdownOf(departAtMs, now, walkMin);
        return {
          ...feature,
          properties: {
            ...feature.properties,
            timer: boardingTimerId(theme, color, countdown, clock, lang),
            time: countdown.kind === "clock" ? "" : boardAt,
          },
        };
      }),
    };
  }, [route, now, theme, lang]);
  const walks = useMemo(() => routeWalksToGeoJson(route), [route]);

  return (
    <>
      <Source id="route-walks" type="geojson" data={walks}>
        <Layer
          id="route-walk"
          type="line"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{ "line-color": palette.walk, "line-width": 3, "line-dasharray": [0.1, 2] }}
        />
      </Source>
      <Source id="route-legs" type="geojson" data={legs}>
        <Layer
          id="route-casing"
          type="line"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{ "line-color": palette.casing, "line-width": 9 }}
        />
        <Layer
          id="route-line"
          type="line"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{
            "line-color": ["get", "color"],
            "line-width": 5,
          }}
        />
      </Source>
      <Source id="route-places" type="geojson" data={places}>
        <Layer
          id={ROUTE_PLACES_LAYER_ID}
          type="circle"
          paint={{
            "circle-radius": ["case", isActive, 14, 11],
            "circle-color": ["case", isActive, ACTIVE_STOP_COLOR, palette.stopFill],
            "circle-stroke-color": palette.ring,
            "circle-stroke-width": 2,
          }}
        />
        <Layer
          id="route-places-selected"
          type="circle"
          filter={["==", ["get", "id"], selectedId ?? ""]}
          paint={{
            "circle-radius": 15,
            "circle-opacity": 0,
            "circle-stroke-color": palette.selected,
            "circle-stroke-width": 3,
          }}
        />
        <Layer
          id="route-places-order"
          type="symbol"
          layout={{
            "text-field": ["to-string", ["get", "order"]],
            "text-font": LABEL_FONT,
            "text-size": 12,
            "text-allow-overlap": true,
            "text-ignore-placement": true,
          }}
          paint={{ "text-color": ["case", isActive, "#ffffff", palette.stopText] }}
        />
      </Source>
      {/* Start and transfers: a countdown ring in the colour of the line boarded there, its number above;
          over the route places, the countdown matters more while walking to the stop. */}
      <Source id="route-boardings" type="geojson" data={boardings}>
        <Layer
          id="route-boarding-timer"
          type="symbol"
          layout={{
            "icon-image": BOARDING_TIMER_IMAGE,
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          }}
        />
        <Layer
          id="route-boarding-line"
          type="symbol"
          layout={{
            "text-field": ["get", "line"],
            "text-font": LABEL_FONT,
            "text-size": 12,
            "text-anchor": "bottom",
            "text-offset": [0, -1.75],
            "text-allow-overlap": true,
          }}
          paint={{
            "text-color": "#ffffff",
            "text-halo-color": ["get", "color"],
            "text-halo-width": 4,
          }}
        />
        {/* Below the ring: where the line is boarded and, while it counts down, the clock time. */}
        <Layer
          id="route-boarding-label"
          type="symbol"
          layout={{
            "text-field": [
              "case",
              ["==", ["get", "time"], ""],
              ["get", "stopName"],
              ["format", ["get", "stopName"], {}, "\n", {}, ["get", "time"], { "font-scale": 0.9 }],
            ],
            "text-font": LABEL_FONT,
            "text-size": 12,
            "text-anchor": "top",
            "text-offset": [0, 1.75],
            "text-max-width": 10,
          }}
          paint={{
            "text-color": palette.label,
            "text-halo-color": palette.labelHalo,
            "text-halo-width": 1.5,
          }}
        />
      </Source>
    </>
  );
}

/** Current time in ms, updated every `intervalMs`. */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
