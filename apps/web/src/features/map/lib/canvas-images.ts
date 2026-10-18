import type { Map as MapLibreMap, MapStyleImageMissingEvent } from "maplibre-gl";
import { MAP_ICON_PIXEL_RATIO } from "./map-style";

const FONT_FALLBACK = "system-ui, sans-serif";

/**
 * The app font from next/font (its family name is generated), with a fallback. Map images
 * draw their text with it, because MapLibre text only has the basemap's Noto Sans.
 */
export function appFont(weight: number, fontSize: number): string {
  const family = getComputedStyle(document.body).getPropertyValue("--font-plus").trim();
  return `${weight} ${fontSize}px ${family ? `${family}, ` : ""}${FONT_FALLBACK}`;
}

/** A canvas of `sizeCss` css px square, scaled for MAP_ICON_PIXEL_RATIO. */
export function imageCanvas(sizeCss: number) {
  const canvas = document.createElement("canvas");
  canvas.width = sizeCss * MAP_ICON_PIXEL_RATIO;
  canvas.height = sizeCss * MAP_ICON_PIXEL_RATIO;
  const ctx = canvas.getContext("2d");
  ctx?.scale(MAP_ICON_PIXEL_RATIO, MAP_ICON_PIXEL_RATIO);
  return { canvas, ctx };
}

/**
 * Draws images into the style when a layer first asks for them; `draw` returns null for ids
 * it does not own. If `font` is not loaded yet, the images drawn so far are redrawn once it is.
 * Returns the cleanup.
 */
export function registerCanvasImages(
  map: MapLibreMap,
  draw: (id: string) => ImageData | null,
  font: string,
): () => void {
  const drawn = new Set<string>();
  const onMissing = ({ id }: MapStyleImageMissingEvent) => {
    if (map.hasImage(id)) return;
    const image = draw(id);
    if (!image) return;
    map.addImage(id, image, { pixelRatio: MAP_ICON_PIXEL_RATIO });
    drawn.add(id);
  };
  map.on("styleimagemissing", onMissing);

  let isActive = true;
  if (!document.fonts.check(font)) {
    document.fonts.load(font).then(() => {
      if (!isActive) return;
      for (const id of drawn) {
        const image = draw(id);
        if (image && map.hasImage(id)) map.updateImage(id, image);
      }
    });
  }
  return () => {
    isActive = false;
    map.off("styleimagemissing", onMissing);
  };
}
