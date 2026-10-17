import { type LatLng, toLngLat } from "@sawa/shared";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import { DESTINATION_COLOR } from "../lib/map-style";

/** Coral dot with a white ring where the ride should end. */
export function DestinationLayer({ position }: { position: LatLng }) {
  const data = useMemo(
    () => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: toLngLat(position) },
      properties: {},
    }),
    [position],
  );

  return (
    <Source id="destination" type="geojson" data={data}>
      <Layer
        id="destination-halo"
        type="circle"
        paint={{ "circle-radius": 20, "circle-color": DESTINATION_COLOR, "circle-opacity": 0.2 }}
      />
      <Layer
        id="destination-dot"
        type="circle"
        paint={{
          "circle-radius": 9,
          "circle-color": DESTINATION_COLOR,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 3,
        }}
      />
    </Source>
  );
}
