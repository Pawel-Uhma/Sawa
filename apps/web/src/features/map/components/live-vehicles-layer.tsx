import type { Route, TrackVehiclesResponse } from "@sawa/shared";
import type { ExpressionSpecification, GeoJSONSource } from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";
import { Layer, Source, useMap } from "react-map-gl/maplibre";
import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion";
import { lineColor, PALE_SHARE, paleColor } from "../lib/map-style";
import { lineIndexes } from "../lib/route-to-geojson";
import {
  applyVehicles,
  MOTION_TIMING,
  REDUCED_MOTION_TIMING,
  type TrailCollection,
  type VehicleCollection,
  type VehicleMotionState,
  type VehicleOnLeg,
  vehicleCollection,
  vehicleTrails,
} from "../lib/vehicle-motion";

const SOURCE_ID = "live-vehicles";
const LAYER_ID = "live-vehicles";
const TRAILS_SOURCE_ID = "live-vehicle-trails";
/** Reduced motion: positions still update, once a second. */
const REDUCED_FRAME_MS = 1000;

const EMPTY: VehicleCollection = { type: "FeatureCollection", features: [] };
const NO_TRAILS: TrailCollection = { type: "FeatureCollection", features: [] };

/** Icons drawn in `public/icons`, one per mode of transport, registered with the map once. */
const VEHICLE_ICONS = ["tram", "bus"] as const;
/** Every vehicle is drawn at one size, the rider's and the other trips alike. */
const ICON_SIZE = 0.55;

type LiveVehiclesLayerProps = {
  /** Latest answer of `POST /v1/vehicles/track`. */
  data: TrackVehiclesResponse | undefined;
  /** The planned route: the trails take the colour of their leg's line. */
  route: Route;
  /** Outline under the trails, the same as under the route line. */
  casing: string;
};

/**
 * Vehicles on the route. The positions come from the predicted tracks and are drawn on every
 * animation frame straight into the map source: React state is not updated per frame.
 */
export function LiveVehiclesLayer({ data, route, casing }: LiveVehiclesLayerProps) {
  const map = useMap().current?.getMap();
  const reduced = usePrefersReducedMotion();
  const timing = reduced ? REDUCED_MOTION_TIMING : MOTION_TIMING;
  const motion = useRef<VehicleMotionState>(new Map());
  const staleRef = useRef(false);
  const trailColor = useMemo(() => paleLegColors(route), [route]);

  useEffect(() => {
    if (!map) return;
    for (const mode of VEHICLE_ICONS) {
      const id = `vehicle-${mode}`;
      if (map.hasImage(id)) continue;
      map.loadImage(`/icons/${id}.png`).then(({ data: image }) => {
        if (!map.hasImage(id)) map.addImage(id, image, { pixelRatio: 2 });
        const pale = `${id}-pale`;
        if (!map.hasImage(pale)) map.addImage(pale, paler(image), { pixelRatio: 2 });
      });
    }
  }, [map]);

  // A new answer: vehicles go on from where they are drawn and catch up with their new tracks.
  useEffect(() => {
    const vehicles: VehicleOnLeg[] =
      data?.legs.flatMap((leg) =>
        leg.vehicles.map((vehicle) => ({ legIndex: leg.legIndex, vehicle })),
      ) ?? [];
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
      const stale = staleRef.current;
      // Vehicles first: that moves them to `now`, and the trails start where they are drawn.
      const vehicles = vehicleCollection(motion.current, now, timing, stale);
      map.getSource<GeoJSONSource>(SOURCE_ID)?.setData(vehicles);
      map
        .getSource<GeoJSONSource>(TRAILS_SOURCE_ID)
        ?.setData(vehicleTrails(motion.current, now, timing, stale));
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [map, reduced, timing]);

  return (
    <>
      {/* Where the previous and next vehicle are going: the route's line style, paler. */}
      <Source id={TRAILS_SOURCE_ID} type="geojson" data={NO_TRAILS}>
        <Layer
          id="live-vehicle-trail-casing"
          type="line"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{ "line-color": casing, "line-width": 9, "line-opacity": ["get", "opacity"] }}
        />
        <Layer
          id="live-vehicle-trail"
          type="line"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{ "line-color": trailColor, "line-width": 5, "line-opacity": ["get", "opacity"] }}
        />
      </Source>
      <Source id={SOURCE_ID} type="geojson" data={EMPTY}>
        <Layer
          id={LAYER_ID}
          type="symbol"
          layout={{
            "icon-image": [
              "concat",
              "vehicle-",
              ["get", "mode"],
              ["case", ["==", ["get", "role"], "ride"], "", "-pale"],
            ],
            "icon-size": ICON_SIZE,
            // The rider's vehicle on top of the others.
            "symbol-sort-key": ["case", ["==", ["get", "role"], "ride"], 1, 0],
            "icon-rotate": ["get", "bearingDeg"],
            "icon-rotation-alignment": "map",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          }}
          paint={{ "icon-opacity": ["get", "opacity"] }}
        />
      </Source>
    </>
  );
}

/** Trail colour by `legIndex`: the colour of the leg's line on the route, paler. */
function paleLegColors(route: Route): ExpressionSpecification | string {
  const fallback = paleColor(lineColor(0));
  const pairs = lineIndexes(route).flatMap((line, legIndex) =>
    line < 0 ? [] : [legIndex, paleColor(lineColor(line))],
  );
  return pairs.length
    ? (["match", ["get", "legIndex"], ...pairs, fallback] as unknown as ExpressionSpecification)
    : fallback;
}

/** The icon with white laid over it, `PALE_SHARE` strong; transparent pixels stay transparent. */
function paler(image: HTMLImageElement | ImageBitmap): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  ctx.drawImage(image, 0, 0);
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = `rgba(255, 255, 255, ${PALE_SHARE})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}
