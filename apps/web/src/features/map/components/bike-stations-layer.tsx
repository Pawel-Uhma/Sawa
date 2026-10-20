import type { BikeStation, Route } from "@sawa/shared";
import type { FilterSpecification } from "maplibre-gl";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import { useLang } from "@/features/i18n";
import { bikeStationsToGeoJson } from "../lib/bike-stations";
import { BIKE_STATION_COLOR, LABEL_FONT_BOLD, type MapPalette } from "../lib/map-style";

const IS_ON_ROUTE: FilterSpecification = ["!=", ["get", "role"], "other"];

/**
 * Veturilo stations on a bike route (#192): small green dots for every station, and the
 * stations where the bike is taken and left larger, with how many bikes and free docks they have.
 */
export function BikeStationsLayer({
  route,
  stations,
  palette,
}: {
  route: Route;
  stations: readonly BikeStation[];
  palette: MapPalette;
}) {
  const lang = useLang();
  const data = useMemo(() => bikeStationsToGeoJson(route, stations, lang), [route, stations, lang]);

  return (
    <Source id="bike-stations" type="geojson" data={data}>
      <Layer
        id="bike-station-dot"
        type="circle"
        filter={["==", ["get", "role"], "other"]}
        minzoom={13}
        paint={{
          "circle-radius": 4,
          "circle-color": BIKE_STATION_COLOR,
          "circle-opacity": ["case", [">", ["get", "bikes"], 0], 0.75, 0.3],
          "circle-stroke-color": palette.ring,
          "circle-stroke-width": 1.5,
        }}
      />
      <Layer
        id="bike-station-route"
        type="circle"
        filter={IS_ON_ROUTE}
        paint={{
          "circle-radius": 8,
          "circle-color": BIKE_STATION_COLOR,
          "circle-stroke-color": palette.ring,
          "circle-stroke-width": 3,
        }}
      />
      <Layer
        id="bike-station-label"
        type="symbol"
        filter={IS_ON_ROUTE}
        layout={{
          "text-field": ["get", "label"],
          "text-font": LABEL_FONT_BOLD,
          "text-size": 12,
          "text-offset": [0, 1.4],
          "text-anchor": "top",
          "text-allow-overlap": true,
        }}
        paint={{
          "text-color": BIKE_STATION_COLOR,
          "text-halo-color": palette.ring,
          "text-halo-width": 2,
        }}
      />
    </Source>
  );
}
