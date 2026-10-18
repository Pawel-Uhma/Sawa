import type { ExpressionSpecification, Map as MapLibreMap } from "maplibre-gl";
import { appFont, imageCanvas, registerCanvasImages } from "./canvas-images";
import { MAP_ICON_PIXEL_RATIO, MAP_PALETTES, type MapTheme } from "./map-style";

/**
 * Cluster circles ("glass" style, docs/ui/propozycje/2015-klastry-2-5-wariantow.png, variant 0) drawn
 * as images, because MapLibre text only has the basemap's Noto Sans and the count must be in Plus Jakarta Sans.
 */
const CLUSTER_BADGE_PREFIX = "sawa-cluster";
/** Radius and font size (css px) by point count, from these counts up. */
const SIZES = [
  { from: 0, radius: 18, fontSize: 13.5 },
  { from: 50, radius: 21, fontSize: 15 },
  { from: 200, radius: 25, fontSize: 16.5 },
] as const;
const STROKE_WIDTH = 1.5;
const SHADOW = { offsetY: 3, blur: 10 };
/** Room around the circle for the shadow. */
const PADDING = 10;

export function clusterBadgeId(theme: MapTheme, count: string): string {
  return `${CLUSTER_BADGE_PREFIX}-${theme}-${count}`;
}

/** Inverse of clusterBadgeId; null for any other image id. */
export function parseClusterBadgeId(id: string): { theme: MapTheme; count: string } | null {
  const prefix = `${CLUSTER_BADGE_PREFIX}-`;
  if (!id.startsWith(prefix)) return null;
  const [theme, count, ...rest] = id.slice(prefix.length).split("-");
  if ((theme !== "light" && theme !== "dark") || !count || rest.length > 0) return null;
  return { theme, count };
}

/** MapLibre expression: badge id by the abbreviated point count of a cluster. */
export function clusterBadgeExpression(theme: MapTheme): ExpressionSpecification {
  return [
    "concat",
    `${CLUSTER_BADGE_PREFIX}-${theme}-`,
    ["to-string", ["get", "point_count_abbreviated"]],
  ];
}

/** Size step for a count like "14" or "1.2k". */
function sizeOf(count: string) {
  const value = count.endsWith("k") ? Number.parseFloat(count) * 1000 : Number(count);
  return SIZES.findLast((size) => value >= size.from) ?? SIZES[0];
}

export function drawClusterBadge(id: string): ImageData | null {
  const badge = parseClusterBadgeId(id);
  if (!badge) return null;
  const { radius, fontSize } = sizeOf(badge.count);
  const sizeCss = 2 * (radius + PADDING);
  const { canvas, ctx } = imageCanvas(sizeCss);
  if (!ctx) return null;

  const palette = MAP_PALETTES[badge.theme];
  const center = sizeCss / 2;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, 2 * Math.PI);
  ctx.shadowColor = palette.clusterShadow;
  ctx.shadowOffsetY = SHADOW.offsetY * MAP_ICON_PIXEL_RATIO;
  ctx.shadowBlur = SHADOW.blur * MAP_ICON_PIXEL_RATIO;
  ctx.fillStyle = palette.clusterFill;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = STROKE_WIDTH;
  ctx.strokeStyle = palette.clusterStroke;
  ctx.stroke();

  ctx.font = appFont(800, fontSize);
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${-0.02 * fontSize}px`;
  ctx.fillStyle = palette.clusterText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Digits sit a bit high on the middle baseline; nudge them to the optical centre.
  ctx.fillText(badge.count, center, center + fontSize * 0.06);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Adds cluster badges to the style when a layer first asks for them, redrawn once the app font
 * loads. Returns the cleanup.
 */
export function registerClusterBadges(map: MapLibreMap): () => void {
  return registerCanvasImages(map, drawClusterBadge, appFont(800, SIZES[0].fontSize));
}
