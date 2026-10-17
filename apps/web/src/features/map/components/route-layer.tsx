import type { Route } from "@sawa/shared";
import type { ExpressionSpecification } from "maplibre-gl";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import { ACTIVE_STOP_COLOR, LABEL_FONT, mapIconId, WALK_COLOR } from "../lib/map-style";
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
  /** Icons registered in the style; draws a stop icon inside the boarding ring. */
  hasIcons: boolean;
};

export function RouteLayer({ route, selectedId, activeId, hasIcons }: RouteLayerProps) {
  const isActive: ExpressionSpecification = ["==", ["get", "id"], activeId ?? ""];
  const legs = useMemo(() => routeLegsToGeoJson(route), [route]);
  const places = useMemo(() => routePlacesToGeoJson(route), [route]);
  const boardings = useMemo(() => routeBoardingsToGeoJson(route), [route]);
  const walks = useMemo(() => routeWalksToGeoJson(route), [route]);

  return (
    <>
      <Source id="route-walks" type="geojson" data={walks}>
        <Layer
          id="route-walk"
          type="line"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{ "line-color": WALK_COLOR, "line-width": 3, "line-dasharray": [0.1, 2] }}
        />
      </Source>
      <Source id="route-legs" type="geojson" data={legs}>
        <Layer
          id="route-casing"
          type="line"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{ "line-color": "#ffffff", "line-width": 9 }}
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
      {/* Start and transfers: a ring in the colour of the line boarded there, with its number. */}
      <Source id="route-boardings" type="geojson" data={boardings}>
        <Layer
          id="route-boarding-circle"
          type="circle"
          paint={{
            "circle-radius": hasIcons
              ? ["case", ["get", "isTransfer"], 15, 14]
              : ["case", ["get", "isTransfer"], 7, 6],
            "circle-color": "#ffffff",
            "circle-stroke-color": ["get", "color"],
            "circle-stroke-width": ["case", ["get", "isTransfer"], 4, 3],
          }}
        />
        {hasIcons && (
          <Layer
            id="route-boarding-icon"
            type="symbol"
            layout={{
              "icon-image": mapIconId("stop"),
              "icon-size": 0.48,
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
            }}
          />
        )}
        <Layer
          id="route-boarding-line"
          type="symbol"
          layout={{
            "text-field": ["get", "line"],
            "text-font": LABEL_FONT,
            "text-size": 12,
            "text-anchor": "bottom",
            "text-offset": hasIcons ? [0, -1.7] : [0, -1],
            "text-allow-overlap": true,
          }}
          paint={{
            "text-color": "#ffffff",
            "text-halo-color": ["get", "color"],
            "text-halo-width": 4,
          }}
        />
      </Source>
      <Source id="route-places" type="geojson" data={places}>
        <Layer
          id={ROUTE_PLACES_LAYER_ID}
          type="circle"
          paint={{
            "circle-radius": ["case", isActive, 14, 11],
            "circle-color": ["case", isActive, ACTIVE_STOP_COLOR, "#18181b"],
            "circle-stroke-color": "#ffffff",
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
            "circle-stroke-color": "#18181b",
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
          paint={{ "text-color": "#ffffff" }}
        />
      </Source>
    </>
  );
}
