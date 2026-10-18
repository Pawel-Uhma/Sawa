import { type LatLng, toLngLat } from "@sawa/shared";
import { useEffect, useMemo } from "react";
import { Layer, Source, useMap } from "react-map-gl/maplibre";
import { USER_COLOR } from "../lib/map-style";

const USER_LAYERS = ["user-halo", "user-dot"];

/** Blue dot with a soft halo where the user is (GPS, or the fixed start in /demo). */
export function UserLayer({ position, ring }: { position: LatLng; ring: string }) {
  const { current: mapRef } = useMap();

  // Layers added later (route, vehicles, places after the icons) land on top and would hide
  // the dot right where the ride starts, so after each render it goes back to the top.
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map?.getLayer("user-dot")) return;
    if (map.getLayersOrder().at(-1) === "user-dot") return;
    for (const id of USER_LAYERS) map.moveLayer(id);
  });

  const data = useMemo(
    () => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: toLngLat(position) },
      properties: {},
    }),
    [position],
  );

  return (
    <Source id="user" type="geojson" data={data}>
      <Layer
        id="user-halo"
        type="circle"
        paint={{ "circle-radius": 18, "circle-color": USER_COLOR, "circle-opacity": 0.18 }}
      />
      <Layer
        id="user-dot"
        type="circle"
        paint={{
          "circle-radius": 7,
          "circle-color": USER_COLOR,
          "circle-stroke-color": ring,
          "circle-stroke-width": 2.5,
        }}
      />
    </Source>
  );
}
