import { useEffect, useState } from "react";
import { Layer, useMap } from "react-map-gl/maplibre";
import type { LngLat } from "../lib/bounds";
import {
  findParkFeatureId,
  PARK_AREA_SOURCE_LAYERS,
  PARK_NAME_SOURCE_LAYERS,
  parkAreaFilter,
} from "../lib/park-highlight";
import { STREET_LINES_SOURCE } from "../lib/street-highlight";

export type ParkSelection = { name: string; lngLat: LngLat };

type ParkLayerProps = {
  /** Park of the selected place: soft fill and solid outline. */
  selected: ParkSelection | null;
  color: string;
};

/**
 * Basemap id of the park's area. Tiles near the park may still be loading when the card opens,
 * so the lookup repeats each time the map settles until it finds the park.
 */
function useParkFeatureId(park: ParkSelection | null): number | null {
  const map = useMap().current?.getMap();
  const [id, setId] = useState<number | null>(null);
  const name = park?.name;
  const lng = park?.lngLat[0];
  const lat = park?.lngLat[1];

  useEffect(() => {
    setId(null);
    if (!map || name === undefined || lng === undefined || lat === undefined) return;
    function look() {
      if (!map || name === undefined || lng === undefined || lat === undefined) return;
      const features = PARK_NAME_SOURCE_LAYERS.flatMap((sourceLayer) =>
        map.querySourceFeatures(STREET_LINES_SOURCE, { sourceLayer }),
      );
      const found = findParkFeatureId(features, name, [lng, lat]);
      if (found === null) return;
      setId(found);
      map.off("idle", look);
    }
    look();
    map.on("idle", look);
    return () => {
      map.off("idle", look);
    };
  }, [map, name, lng, lat]);

  return id;
}

/**
 * Whole area of a park, square or garden, drawn from the basemap under the place icons. Like
 * StreetLayer, SawaMap renders it before PlacesLayer instead of using beforeId (theme switch).
 */
export function ParkLayer({ selected, color }: ParkLayerProps) {
  const filter = parkAreaFilter(useParkFeatureId(selected));

  return (
    <>
      {PARK_AREA_SOURCE_LAYERS.map((sourceLayer) => (
        <Layer
          key={`fill-${sourceLayer}`}
          id={`park-selected-fill-${sourceLayer}`}
          type="fill"
          source={STREET_LINES_SOURCE}
          source-layer={sourceLayer}
          filter={filter}
          paint={{ "fill-color": color, "fill-opacity": 0.22 }}
        />
      ))}
      {PARK_AREA_SOURCE_LAYERS.map((sourceLayer) => (
        <Layer
          key={`outline-${sourceLayer}`}
          id={`park-selected-outline-${sourceLayer}`}
          type="line"
          source={STREET_LINES_SOURCE}
          source-layer={sourceLayer}
          filter={filter}
          layout={{ "line-join": "round" }}
          paint={{ "line-color": color, "line-opacity": 0.9, "line-width": 2 }}
        />
      ))}
    </>
  );
}
