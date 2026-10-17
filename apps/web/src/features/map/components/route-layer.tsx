import type { Route } from "@sawa/shared";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import { LABEL_FONT, LEG_MODE_COLORS } from "../lib/map-style";
import { routeLegsToGeoJson, routePlacesToGeoJson } from "../lib/route-to-geojson";

export const ROUTE_PLACES_LAYER_ID = "route-places-circle";

type RouteLayerProps = {
  route: Route;
  selectedId: string | null;
};

export function RouteLayer({ route, selectedId }: RouteLayerProps) {
  const legs = useMemo(() => routeLegsToGeoJson(route), [route]);
  const places = useMemo(() => routePlacesToGeoJson(route), [route]);

  return (
    <>
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
            "line-color": [
              "match",
              ["get", "mode"],
              "bus",
              LEG_MODE_COLORS.bus,
              LEG_MODE_COLORS.tram,
            ],
            "line-width": 5,
          }}
        />
      </Source>
      <Source id="route-places" type="geojson" data={places}>
        <Layer
          id={ROUTE_PLACES_LAYER_ID}
          type="circle"
          paint={{
            "circle-radius": 11,
            "circle-color": "#18181b",
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
