import type { ExpressionSpecification, Map as MapLibreMap } from "maplibre-gl";
import { type Lang, pick } from "@/features/i18n";
import { appFont, imageCanvas, registerCanvasImages } from "./canvas-images";
import { MAP_ICON_PIXEL_RATIO, MAP_PALETTES, type MapTheme } from "./map-style";

/**
 * Boarding stop as a countdown ring (docs/ui/propozycje/0904-przystanek-odjazd-00-zestawienie.png,
 * variant B): minutes to departure in the middle, a ring in the line colour that drains like a
 * kitchen timer. Drawn as images so the digits are in Plus Jakarta Sans.
 */
const TIMER_PREFIX = "sawa-timer";
/** A full ring means this many minutes or more. */
export const TIMER_FULL_MIN = 15;
/** Above this the ring shows the clock time instead of minutes. */
const MAX_COUNTDOWN_MIN = 99;
/** The ring is coral when the departure is this close or closer than the walk to the stop. */
export const HURRY_COLOR = "#f2755f";
const RADIUS = 20;
const RING_WIDTH = 5;
const PADDING = 7;
const SHADOW = { offsetY: 2, blur: 6, color: "rgba(16, 43, 42, 0.28)" };

/** `min`: whole minutes left, rounded up; `now`: under a minute; `clock`: far ahead or gone. */
export type Countdown =
  | { kind: "min"; min: number; isHurry: boolean }
  | { kind: "now" }
  | { kind: "clock" };

/**
 * What the ring shows for a departure at `departAtMs`, `walkMin` minutes of walking away.
 * A departure that left over a minute ago shows its clock time, like one far ahead.
 */
export function countdownOf(departAtMs: number, nowMs: number, walkMin: number): Countdown {
  const leftSec = (departAtMs - nowMs) / 1000;
  if (leftSec < -60 || leftSec > MAX_COUNTDOWN_MIN * 60) return { kind: "clock" };
  if (leftSec < 60) return { kind: "now" };
  const min = Math.ceil(leftSec / 60);
  return { kind: "min", min, isHurry: min <= Math.ceil(walkMin) };
}

/**
 * `color` is `#rrggbb`; `clock` is "14:05", shown only for the `clock` kind; `lang` picks the
 * word for `now`.
 */
export function boardingTimerId(
  theme: MapTheme,
  color: string,
  countdown: Countdown,
  clock: string,
  lang: Lang,
): string {
  const content =
    countdown.kind === "min"
      ? `m${countdown.min}${countdown.isHurry ? "h" : ""}`
      : countdown.kind === "now"
        ? `now${lang}`
        : `c${clock}`;
  return `${TIMER_PREFIX}-${theme}-${color.slice(1)}-${content}`;
}

type ParsedTimer = {
  theme: MapTheme;
  color: string;
  countdown: Countdown;
  clock: string;
  lang: Lang;
};

/** Inverse of boardingTimerId; null for any other image id. */
export function parseBoardingTimerId(id: string): ParsedTimer | null {
  const match = new RegExp(`^${TIMER_PREFIX}-(light|dark)-([0-9a-f]{6})-(.+)$`, "i").exec(id);
  if (!match) return null;
  const [, theme, hex, content] = match;
  const base = { theme: theme as MapTheme, color: `#${hex}`, clock: "", lang: "pl" as Lang };
  if (content === "nowpl" || content === "nowen") {
    return { ...base, countdown: { kind: "now" }, lang: content.slice(3) as Lang };
  }
  if (content.startsWith("c")) return { ...base, countdown: { kind: "clock" }, clock: content.slice(1) };
  const minutes = /^m(\d+)(h?)$/.exec(content);
  if (!minutes) return null;
  return {
    ...base,
    countdown: { kind: "min", min: Number(minutes[1]), isHurry: minutes[2] === "h" },
  };
}

/** MapLibre expression: the timer image id from the boarding's `timer` property. */
export const BOARDING_TIMER_IMAGE: ExpressionSpecification = ["get", "timer"];

export function drawBoardingTimer(id: string): ImageData | null {
  const timer = parseBoardingTimerId(id);
  if (!timer) return null;
  const { countdown } = timer;
  const palette = MAP_PALETTES[timer.theme];
  const sizeCss = 2 * (RADIUS + PADDING);
  const { canvas, ctx } = imageCanvas(sizeCss);
  if (!ctx) return null;
  const center = sizeCss / 2;
  const isHurry = countdown.kind === "min" && countdown.isHurry;
  const accent = isHurry ? HURRY_COLOR : timer.color;

  // Under a minute: a pale halo around the ring, the bus is about to leave.
  if (countdown.kind === "now") {
    ctx.beginPath();
    ctx.arc(center, center, RADIUS + 3.5, 0, 2 * Math.PI);
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.beginPath();
  ctx.arc(center, center, RADIUS, 0, 2 * Math.PI);
  ctx.shadowColor = SHADOW.color;
  ctx.shadowOffsetY = SHADOW.offsetY * MAP_ICON_PIXEL_RATIO;
  ctx.shadowBlur = SHADOW.blur * MAP_ICON_PIXEL_RATIO;
  ctx.fillStyle = palette.boardingFill;
  ctx.fill();
  ctx.shadowColor = "transparent";

  const ringRadius = RADIUS - RING_WIDTH / 2;
  ctx.lineWidth = RING_WIDTH;
  ctx.beginPath();
  ctx.arc(center, center, ringRadius, 0, 2 * Math.PI);
  ctx.strokeStyle = palette.timerTrack;
  ctx.stroke();
  const share = countdown.kind === "min" ? Math.min(countdown.min / TIMER_FULL_MIN, 1) : 1;
  const start = -Math.PI / 2;
  ctx.beginPath();
  ctx.arc(center, center, ringRadius, start, start + share * 2 * Math.PI);
  ctx.lineCap = share < 1 ? "round" : "butt";
  ctx.strokeStyle = accent;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = isHurry ? HURRY_COLOR : palette.label;
  if (countdown.kind === "min") {
    ctx.font = appFont(800, 15);
    ctx.fillText(String(countdown.min), center, center - 2.5);
    ctx.font = appFont(700, 7);
    ctx.fillStyle = palette.walk;
    ctx.fillText("MIN", center, center + 8);
  } else {
    // "teraz" fits the ring only at this size, the clock time too
    const text = countdown.kind === "now" ? pick(timer.lang, "teraz", "now") : timer.clock;
    ctx.font = appFont(800, countdown.kind === "now" ? 10.5 : 9.5);
    ctx.fillText(text, center, center + 0.5);
  }
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/** Adds timer images to the style when the route layer asks for them. Returns the cleanup. */
export function registerBoardingTimers(map: MapLibreMap): () => void {
  return registerCanvasImages(map, drawBoardingTimer, appFont(800, 15));
}
