import type { Map as MapLibreMap } from "maplibre-gl";
import { appFont, imageCanvas, registerCanvasImages } from "./canvas-images";
import { USER_COLOR } from "./map-style";

/** Soft cone in front of the user dot, pointing where the phone is heading (#193). */
export const HEADING_CONE_IMAGE = "sawa-heading-cone";

const ARROW_PREFIX = "sawa-guide-arrow:";

/** Arrow head at the end of the guide line; the outline takes the theme's ring colour. */
export function guideArrowImageId(ring: string): string {
  return `${ARROW_PREFIX}${ring}`;
}

const CONE_SIZE = 96;
const CONE_HALF_ANGLE = (38 * Math.PI) / 180;
const ARROW_SIZE = 26;

function drawCone(): ImageData | null {
  const { canvas, ctx } = imageCanvas(CONE_SIZE);
  if (!ctx) return null;
  const c = CONE_SIZE / 2;
  const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
  gradient.addColorStop(0, `${USER_COLOR}80`);
  gradient.addColorStop(1, `${USER_COLOR}00`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(c, c);
  // Canvas angles start east; the cone points up (north before icon-rotate).
  ctx.arc(c, c, c, -Math.PI / 2 - CONE_HALF_ANGLE, -Math.PI / 2 + CONE_HALF_ANGLE);
  ctx.closePath();
  ctx.fill();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function drawArrow(ring: string): ImageData | null {
  const { canvas, ctx } = imageCanvas(ARROW_SIZE);
  if (!ctx) return null;
  const s = ARROW_SIZE;
  ctx.beginPath();
  ctx.moveTo(s / 2, 3);
  ctx.lineTo(s - 4, s - 5);
  ctx.lineTo(s / 2, s - 9);
  ctx.lineTo(4, s - 5);
  ctx.closePath();
  ctx.lineJoin = "round";
  ctx.lineWidth = 3;
  ctx.strokeStyle = ring;
  ctx.stroke();
  ctx.fillStyle = USER_COLOR;
  ctx.fill();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/** Draws the cone and arrow heads on demand (also after a theme swaps the style). Returns the cleanup. */
export function registerNavigationImages(map: MapLibreMap): () => void {
  return registerCanvasImages(
    map,
    (id) => {
      if (id === HEADING_CONE_IMAGE) return drawCone();
      if (id.startsWith(ARROW_PREFIX)) return drawArrow(id.slice(ARROW_PREFIX.length));
      return null;
    },
    // No text in these images; the font only decides when drawn images are refreshed.
    appFont(400, 12),
  );
}
