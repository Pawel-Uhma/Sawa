import type { LiveVehicle, TrackVehiclesResponse } from "@sawa/shared";
import type { GeoJSONSource } from "maplibre-gl";
import { useEffect, useRef } from "react";
import { Layer, Source, useMap } from "react-map-gl/maplibre";
import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion";
import {
  applyVehicles,
  MOTION_TIMING,
  REDUCED_MOTION_TIMING,
  type VehicleCollection,
  type VehicleMotionState,
  vehicleCollection,
} from "../lib/vehicle-motion";

const SOURCE_ID = "live-vehicles";
const LAYER_ID = "live-vehicles";
/** Reduced motion: positions still update, once a second. */
const REDUCED_FRAME_MS = 1000;

const EMPTY: VehicleCollection = { type: "FeatureCollection", features: [] };

/** Icons drawn in `public/icons`, one per mode of transport, registered with the map once. */
const VEHICLE_ICONS = ["tram", "bus"] as const;

type LiveVehiclesLayerProps = {
  /** Latest answer of `POST /v1/vehicles/track`. */
  data: TrackVehiclesResponse | undefined;
};

/**
 * Vehicles on the route. The positions come from the predicted tracks and are drawn on every
 * animation frame straight into the map source: React state is not updated per frame.
 */
export function LiveVehiclesLayer({ data }: LiveVehiclesLayerProps) {
  const map = useMap().current?.getMap();
  const reduced = usePrefersReducedMotion();
  const timing = reduced ? REDUCED_MOTION_TIMING : MOTION_TIMING;
  const motion = useRef<VehicleMotionState>(new Map());
  const staleRef = useRef(false);

  useEffect(() => {
    if (!map) return;
    for (const mode of VEHICLE_ICONS) {
      const id = `vehicle-${mode}`;
      if (map.hasImage(id)) continue;
      map.loadImage(`/icons/${id}.png`).then(({ data: image }) => {
        if (!map.hasImage(id)) map.addImage(id, image, { pixelRatio: 2 });
      });
    }
  }, [map]);

  // A new answer: vehicles glide from where they are drawn to their new tracks.
  useEffect(() => {
    const vehicles: LiveVehicle[] = data?.legs.flatMap((leg) => leg.vehicles) ?? [];
    motion.current = applyVehicles(motion.current, vehicles, Date.now(), timing);
    staleRef.current = data?.stale ?? false;
  }, [data, timing]);

  useEffect(() => {
    if (!map) return;
    let frame = 0;
    let lastDrawn = 0;
    let wasEmpty = true;
    const minGapMs = reduced ? REDUCED_FRAME_MS : 0;

    const draw = () => {
      frame = requestAnimationFrame(draw);
      const now = Date.now();
      if (now - lastDrawn < minGapMs) return;
      if (motion.current.size === 0 && wasEmpty) return;
      lastDrawn = now;
      wasEmpty = motion.current.size === 0;
      const source = map.getSource<GeoJSONSource>(SOURCE_ID);
      source?.setData(vehicleCollection(motion.current, now, timing, staleRef.current));
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [map, reduced, timing]);

  return (
    <Source id={SOURCE_ID} type="geojson" data={EMPTY}>
      <Layer
        id={LAYER_ID}
        type="symbol"
        layout={{
          "icon-image": ["match", ["get", "mode"], "tram", "vehicle-tram", "vehicle-bus"],
          "icon-size": ["case", ["==", ["get", "role"], "ride"], 0.55, 0.42],
          "icon-rotate": ["get", "bearingDeg"],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        }}
        paint={{ "icon-opacity": ["get", "opacity"] }}
      />
    </Source>
  );
}
