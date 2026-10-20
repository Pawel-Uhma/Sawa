import type { Map as MapLibreMap } from "maplibre-gl";
import { appFont, imageCanvas, registerCanvasImages } from "./canvas-images";
import { USER_COLOR } from "./map-style";

/** Soft cone in front of the user dot, pointing where the phone is heading (#193). */
export const HEADING_CONE_IMAGE = "sawa-heading-cone";

const CHEVRON_PREFIX = "sawa-route-chevron:";

/** Chevron repeated along the ride lines, pointing the way the line goes; in the given colour. */
export function routeChevronImageId(color: string): string {
  return `${CHEVRON_PREFIX}${color}`;
}

const CONE_SIZE = 96;
const CONE_HALF_ANGLE = (38 * Math.PI) / 180;
const CHEVRON_SIZE = 14;

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

/** "›" pointing right: a symbol placed along a line turns its right side the way the line goes. */
function drawChevron(color: string): ImageData | null {
  const { canvas, ctx } = imageCanvas(CHEVRON_SIZE);
  if (!ctx) return null;
  const s = CHEVRON_SIZE;
  ctx.beginPath();
  ctx.moveTo(s * 0.32, s * 0.18);
  ctx.lineTo(s * 0.66, s / 2);
  ctx.lineTo(s * 0.32, s * 0.82);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 2.75;
  ctx.strokeStyle = color;
  ctx.stroke();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/** Draws the cone and route chevrons on demand (also after a theme swaps the style). Returns the cleanup. */
export function registerNavigationImages(map: MapLibreMap): () => void {
  return registerCanvasImages(
    map,
    (id) => {
      if (id === HEADING_CONE_IMAGE) return drawCone();
      if (id.startsWith(CHEVRON_PREFIX)) return drawChevron(id.slice(CHEVRON_PREFIX.length));
      return null;
    },
    // No text in these images; the font only decides when drawn images are refreshed.
    appFont(400, 12),
  );
}
