import { type LatLng, toLngLat } from "@sawa/shared";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import { USER_COLOR } from "../lib/map-style";

/** Blue dot with a soft halo where the user is (GPS, or the fixed start in /demo). */
export function UserLayer({ position, ring }: { position: LatLng; ring: string }) {
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
