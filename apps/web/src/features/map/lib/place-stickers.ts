import type { Map as MapLibreMap, MapStyleImageMissingEvent } from "maplibre-gl";
import { MAP_ICON_PIXEL_RATIO, parsePlaceStickerId, placeStickerColors } from "./map-style";
import PLACE_GLYPHS from "./place-glyphs.json";

/** Same geometry as docs/ui/ikony-mapy/znaczniki.mjs: 24-unit glyph in a 40-unit box, 96 px. */
const SIZE_PX = 96;
const BOX = 40;
const GLYPH_OFFSET = { x: 6.5, y: 5.5 };
const GLYPH_SCALE = 1.12;
const OUTLINE_WIDTH = 3.2 / GLYPH_SCALE;
const SHADOW = { color: "rgba(16, 43, 42, 0.3)", offsetY: 1.5, blur: 1.4 };

const GLYPHS: Record<string, string> = PLACE_GLYPHS;

/**
 * Draws one place sticker for an image id from placeStickerId: the subkind glyph filled with its
 * group colour over a white outline, with a soft shadow. Null for other ids.
 */
export function drawPlaceSticker(id: string): ImageData | null {
  const sticker = parsePlaceStickerId(id);
  const path = sticker && GLYPHS[sticker.marker];
  if (!sticker || !path) return null;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE_PX;
  canvas.height = SIZE_PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const { fill, outline } = placeStickerColors(sticker.marker);
  const unit = SIZE_PX / BOX;
  const glyph = new Path2D(path);
  ctx.scale(unit, unit);
  ctx.translate(GLYPH_OFFSET.x, GLYPH_OFFSET.y);
  ctx.scale(GLYPH_SCALE, GLYPH_SCALE);
  // Shadow only under the outline, so it does not darken the glyph's own edges.
  ctx.shadowColor = SHADOW.color;
  ctx.shadowOffsetY = SHADOW.offsetY * unit;
  ctx.shadowBlur = SHADOW.blur * 2 * unit;
  ctx.lineJoin = "round";
  ctx.lineWidth = OUTLINE_WIDTH;
  ctx.strokeStyle = outline;
  ctx.fillStyle = outline;
  ctx.stroke(glyph);
  ctx.fill(glyph, "evenodd");
  ctx.shadowColor = "transparent";
  ctx.fillStyle = fill;
  ctx.fill(glyph, "evenodd");
  return ctx.getImageData(0, 0, SIZE_PX, SIZE_PX);
}

/**
 * Adds place stickers to the style when a layer first asks for them. Ids carry the theme,
 * so a theme switch (a new basemap style) draws a fresh set. Returns the cleanup.
 */
export function registerPlaceStickers(map: MapLibreMap): () => void {
  const onMissing = ({ id }: MapStyleImageMissingEvent) => {
    if (map.hasImage(id)) return;
    const image = drawPlaceSticker(id);
    if (image) map.addImage(id, image, { pixelRatio: MAP_ICON_PIXEL_RATIO });
  };
  map.on("styleimagemissing", onMissing);
  return () => {
    map.off("styleimagemissing", onMissing);
  };
}
