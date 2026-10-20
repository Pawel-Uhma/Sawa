import { Layer } from "react-map-gl/maplibre";

/**
 * Bike paths from the basemap (OpenMapTiles `transportation`, `path/cycleway`), shown while
 * planning or riding by bike, so it is clear where the route keeps off the street. Drawn under
 * the road names and under the route and places, which are added to the style after it.
 */
export function BikePathsLayer({ color, beforeId }: { color: string; beforeId?: string }) {
  return (
    <Layer
      id="sawa-bike-paths"
      type="line"
      source="openmaptiles"
      source-layer="transportation"
      minzoom={12}
      beforeId={beforeId}
      filter={["all", ["==", ["get", "class"], "path"], ["==", ["get", "subclass"], "cycleway"]]}
      layout={{ "line-cap": "round", "line-join": "round" }}
      paint={{
        "line-color": color,
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 1.2, 15, 2.5, 18, 5],
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0.55, 15, 0.85],
      }}
    />
  );
}

/**
 * Where bike paths go: under the first label drawn after the last road line, so they sit on top
 * of the roads but under the names. The light and dark styles name and order their layers
 * differently (dark has water names under the roads), so the place is found by type and source.
 */
export function bikePathsBeforeId(
  layers: readonly { id: string; type: string; "source-layer"?: string }[] | undefined,
): string | undefined {
  if (!layers) return undefined;
  let lastRoad = -1;
  layers.forEach((layer, i) => {
    if (layer.type === "line" && layer["source-layer"] === "transportation") lastRoad = i;
  });
  return layers.find((layer, i) => i > lastRoad && layer.type === "symbol")?.id;
}
