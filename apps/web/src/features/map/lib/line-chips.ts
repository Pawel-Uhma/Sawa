import type { Leg } from "@sawa/shared";
import type { ExpressionSpecification, Map as MapLibreMap } from "maplibre-gl";
import { appFont, registerCanvasImages } from "./canvas-images";
import { MAP_ICON_PIXEL_RATIO, MAP_PALETTES, type MapTheme } from "./map-style";

/**
 * Line label over a boarding ring: the line in its route colour with the vehicle icon, and at
 * a transfer the line left and the line boarded with an arrow ("122 → 180"), like the
 * "Dojazd" list. Drawn as an image, because MapLibre text has one halo colour and no icons.
 */
const CHIP_PREFIX = "sawa-chip";

export type ChipLine = { line: string; mode: Exclude<Leg["mode"], "walk">; color: string };

const FONT_SIZE = 12;
const ICON_SIZE = 12;
const CHIP_HEIGHT = 20;
const CHIP_PAD_X = 6;
const CHIP_GAP = 3;
const ARROW_WIDTH = 14;
const OUTER_PAD = 3;
const SHADOW = { offsetY: 1.5, blur: 5, color: "rgba(16, 43, 42, 0.25)" };
const SHADOW_ROOM = 6;

/** The icons of `TramIcon` and `BusIcon` (apps/web icons.tsx), on a 24-unit grid. */
const MODE_PATHS: Record<ChipLine["mode"], string[]> = {
  // Narrow and tall like a tram car, so it is easy to tell from the wide bus
  tram: [
    "M9.5 5h5A2.5 2.5 0 0 1 17 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-5A2.5 2.5 0 0 1 7 16.5v-9A2.5 2.5 0 0 1 9.5 5z",
    "M9.5 2h5M12 2v3M7 12h10M10 22l.8-3M14 22l-.8-3",
  ],
  bus: [
    "M7 4h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z",
    "M4 11h16M8 18v2M16 18v2M8 14.5h.01M16 14.5h.01",
  ],
};

/** Image id for the lines of one boarding; `lines` has one line, or two at a transfer. */
export function lineChipId(theme: MapTheme, lines: readonly ChipLine[]): string {
  const parts = lines.map(
    ({ line, mode, color }) => `${mode}.${color.slice(1)}.${encodeURIComponent(line)}`,
  );
  // encodeURIComponent turns "|" into %7C, so it never shows up inside a part
  return `${CHIP_PREFIX}-${theme}-${parts.join("|")}`;
}

/** Inverse of lineChipId; null for any other image id. */
export function parseLineChipId(id: string): { theme: MapTheme; lines: ChipLine[] } | null {
  const match = new RegExp(`^${CHIP_PREFIX}-(light|dark)-(.+)$`).exec(id);
  if (!match) return null;
  const lines: ChipLine[] = [];
  for (const part of match[2].split("|")) {
    const chip = /^(tram|bus)\.([0-9a-f]{6})\.(.+)$/i.exec(part);
    if (!chip) return null;
    lines.push({
      mode: chip[1] as ChipLine["mode"],
      color: `#${chip[2]}`,
      line: decodeURIComponent(chip[3]),
    });
  }
  return lines.length > 0 ? { theme: match[1] as MapTheme, lines } : null;
}

/** MapLibre expression: the chip image id from the boarding's `chip` property. */
export const LINE_CHIP_IMAGE: ExpressionSpecification = ["get", "chip"];

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
}

export function drawLineChip(id: string): ImageData | null {
  const chip = parseLineChipId(id);
  if (!chip) return null;
  const palette = MAP_PALETTES[chip.theme];
  const font = appFont(800, FONT_SIZE);
  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) return null;
  measure.font = font;
  const widths = chip.lines.map(
    ({ line }) => CHIP_PAD_X * 2 + ICON_SIZE + CHIP_GAP + measure.measureText(line).width,
  );
  const inner = widths.reduce((sum, w) => sum + w, 0) + ARROW_WIDTH * (chip.lines.length - 1);
  const widthCss = Math.ceil(inner + OUTER_PAD * 2 + SHADOW_ROOM * 2);
  const heightCss = CHIP_HEIGHT + OUTER_PAD * 2 + SHADOW_ROOM * 2;

  const canvas = document.createElement("canvas");
  canvas.width = widthCss * MAP_ICON_PIXEL_RATIO;
  canvas.height = heightCss * MAP_ICON_PIXEL_RATIO;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(MAP_ICON_PIXEL_RATIO, MAP_ICON_PIXEL_RATIO);

  // Background pill in the map's surface colour, so the chips read on any street below
  roundRect(ctx, SHADOW_ROOM, SHADOW_ROOM, inner + OUTER_PAD * 2, CHIP_HEIGHT + OUTER_PAD * 2);
  ctx.shadowColor = SHADOW.color;
  ctx.shadowOffsetY = SHADOW.offsetY * MAP_ICON_PIXEL_RATIO;
  ctx.shadowBlur = SHADOW.blur * MAP_ICON_PIXEL_RATIO;
  ctx.fillStyle = palette.boardingFill;
  ctx.fill();
  ctx.shadowColor = "transparent";

  let x = SHADOW_ROOM + OUTER_PAD;
  const y = SHADOW_ROOM + OUTER_PAD;
  ctx.font = font;
  ctx.textBaseline = "middle";
  chip.lines.forEach(({ line, mode, color }, i) => {
    if (i > 0) {
      // Arrow from the line left to the line boarded
      const mid = y + CHIP_HEIGHT / 2;
      ctx.strokeStyle = palette.label;
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(x + 3, mid);
      ctx.lineTo(x + ARROW_WIDTH - 3, mid);
      ctx.moveTo(x + ARROW_WIDTH - 6, mid - 3);
      ctx.lineTo(x + ARROW_WIDTH - 3, mid);
      ctx.lineTo(x + ARROW_WIDTH - 6, mid + 3);
      ctx.stroke();
      x += ARROW_WIDTH;
    }
    const w = widths[i] ?? 0;
    roundRect(ctx, x, y, w, CHIP_HEIGHT);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.save();
    ctx.translate(x + CHIP_PAD_X, y + (CHIP_HEIGHT - ICON_SIZE) / 2);
    ctx.scale(ICON_SIZE / 24, ICON_SIZE / 24);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const d of MODE_PATHS[mode]) ctx.stroke(new Path2D(d));
    ctx.restore();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.fillText(line, x + CHIP_PAD_X + ICON_SIZE + CHIP_GAP, y + CHIP_HEIGHT / 2 + 0.5);
    x += w;
  });
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/** Adds chip images to the style when the route layer asks for them. Returns the cleanup. */
export function registerLineChips(map: MapLibreMap): () => void {
  return registerCanvasImages(map, drawLineChip, appFont(800, FONT_SIZE));
}
