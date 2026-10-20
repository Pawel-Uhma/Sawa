import { isTransitMode, type PlaceSummaryFeature, type Route } from "@sawa/shared";
import type { ExpressionSpecification, FilterSpecification } from "maplibre-gl";
import { useEffect, useMemo, useState } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import { useLang } from "@/features/i18n";
import { BOARDING_TIMER_IMAGE, boardingTimerId, countdownOf } from "../lib/boarding-timers";
import { LINE_CHIP_IMAGE, lineChipId } from "../lib/line-chips";
import {
  ACTIVE_STOP_COLOR,
  LABEL_FONT,
  LABEL_FONT_BOLD,
  type MapLook,
  type MapPalette,
  type MapTheme,
  placeKindColorExpression,
  placeStickerExpression,
} from "../lib/map-style";
import { routeChevronImageId } from "../lib/navigation-images";
import {
  boardingTouchesLegs,
  type PlaceMarkers,
  routeAlightingsToGeoJson,
  routeBoardingsToGeoJson,
  routeLegsToGeoJson,
  routePassedStopsToGeoJson,
  routePlacesToGeoJson,
  routeWalksToGeoJson,
} from "../lib/route-to-geojson";

export const ROUTE_PLACES_LAYER_ID = "route-places-circle";
/** Layers in the stop components below name it themselves: `<Source>` only passes it to direct children. */
const ROUTE_PLACES_SOURCE_ID = "route-places";

/** Sticker scale (1 = 48 css px): larger than regular places, the active one larger still. */
const STICKER_SIZE = 0.8;
const ACTIVE_STICKER_SIZE = 1;
/** Number badge in the sticker's bottom-right corner, px from its centre. */
const BADGE_OFFSET: [number, number] = [12, 12];
const ACTIVE_BADGE_OFFSET: [number, number] = [15, 15];
const BADGE_TEXT_SIZE = 11;

type RouteLayerProps = {
  route: Route;
  selectedId: string | null;
  /** Place the story is about right now; drawn larger and in the accent colour. */
  activeId?: string;
  /** Legs picked in the "Dojazd" list (`highlightedLegs`): they stay, the rest of the route fades. */
  highlightLegs?: readonly number[] | null;
  /**
   * The user picked `highlightLegs` by hand (not the current line during the ride): transfers
   * and route places away from them fade too.
   */
  isPicked?: boolean;
  /** Icons registered in the style; route places are drawn as subkind stickers. */
  hasIcons: boolean;
  /** Loaded place summaries: route places among them get their subkind sticker, the rest a pin. */
  knownPlaces: PlaceSummaryFeature[];
  theme: MapTheme;
  /** Stickers of route places: the theme, or high contrast (timers stay on the theme). */
  stickerLook?: MapLook;
  palette: MapPalette;
};

/** Gap between the direction chevrons along a ride line. */
const CHEVRON_SPACING_PX = 72;

/** How often the countdown at boarding stops is redrawn. */
const COUNTDOWN_TICK_MS = 15_000;

/** Boarding rings and their line labels: a click picks the line, at a transfer both lines. */
export const ROUTE_BOARDING_LAYER_IDS = ["route-boarding-timer", "route-boarding-line"];

/** Opacity of the lines not picked in the "Dojazd" list. */
export const FADED_OPACITY = 0.25;

/** Route places on the picked legs, a step behind the lines; the active place stays at 1. */
const PICKED_PLACE_OPACITY = 0.75;

/**
 * `picked` for a feature whose `legIndex` is among the legs chosen in the list, `other` for the
 * rest; without a choice simply `normal`.
 */
export function legValue(
  legs: readonly number[] | null,
  picked: number,
  other: number,
  normal = picked,
): number | ExpressionSpecification {
  if (legs === null) return normal;
  return ["case", ["in", ["get", "legIndex"], ["literal", [...legs]]], picked, other];
}

export function RouteLayer({
  route,
  selectedId,
  activeId,
  highlightLegs = null,
  isPicked = false,
  hasIcons,
  knownPlaces,
  theme,
  stickerLook = theme,
  palette,
}: RouteLayerProps) {
  const lang = useLang();
  const isActive: ExpressionSpecification = ["==", ["get", "id"], activeId ?? ""];
  const picked = isPicked ? highlightLegs : null;
  const placeOpacity: number | ExpressionSpecification =
    picked === null
      ? 1
      : ["case", isActive, 1, legValue(picked, PICKED_PLACE_OPACITY, FADED_OPACITY)];
  const boardingOpacity: number | ExpressionSpecification =
    picked === null ? 1 : ["case", ["get", "isPicked"], 1, FADED_OPACITY];
  const legs = useMemo(() => routeLegsToGeoJson(route), [route]);
  const markers = useMemo<PlaceMarkers>(
    () =>
      new Map(knownPlaces.map(({ properties: p }) => [p.id, { kind: p.kind, subkind: p.subkind }])),
    [knownPlaces],
  );
  const places = useMemo(() => routePlacesToGeoJson(route, markers), [route, markers]);
  const now = useNow(COUNTDOWN_TICK_MS);
  // Each boarding gets its countdown ring image and, while it counts minutes, the clock time below.
  const boardings = useMemo(() => {
    const collection = routeBoardingsToGeoJson(route);
    return {
      ...collection,
      features: collection.features.map((feature) => {
        const { color, clock, departAtMs, walkMin, boardAt, line, mode } = feature.properties;
        const { fromLine, fromMode, fromColor } = feature.properties;
        const countdown = countdownOf(departAtMs, now, walkMin);
        // Boardings are only at ZTM lines; walks, bikes and cars have no chip
        const boarded = isTransitMode(mode) ? [{ line, mode, color }] : [];
        const left =
          fromMode && isTransitMode(fromMode)
            ? [{ line: fromLine, mode: fromMode, color: fromColor }]
            : [];
        return {
          ...feature,
          properties: {
            ...feature.properties,
            chip: lineChipId(theme, [...left, ...boarded]),
            timer: boardingTimerId(theme, color, countdown, clock, lang),
            time: countdown.kind === "clock" ? "" : boardAt,
            isPicked: picked === null || boardingTouchesLegs(feature.properties, picked),
          },
        };
      }),
    };
  }, [route, now, theme, lang, picked]);
  const walks = useMemo(() => routeWalksToGeoJson(route), [route]);
  const passed = useMemo(() => routePassedStopsToGeoJson(route), [route]);
  // Where to get off: a dot in the line colour and "106 wysiądź" over it
  const alightings = useMemo(() => {
    const collection = routeAlightingsToGeoJson(route);
    return {
      ...collection,
      features: collection.features.map((feature) => {
        const { line, mode, color } = feature.properties;
        const chip = isTransitMode(mode)
          ? lineChipId(theme, [{ line, mode, color }], { lang: lang === "en" ? "en" : "pl" })
          : "";
        return { ...feature, properties: { ...feature.properties, chip } };
      }),
    };
  }, [route, theme, lang]);
  const alightOpacity = picked === null ? 1 : legValue(picked, 1, FADED_OPACITY);

  return (
    <>
      <Source id="route-walks" type="geojson" data={walks}>
        <Layer
          id="route-walk"
          type="line"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{
            "line-color": palette.walk,
            "line-width": legValue(highlightLegs, 5, 3, 3),
            "line-opacity": legValue(highlightLegs, 1, FADED_OPACITY),
            "line-dasharray": [0.1, 2],
          }}
        />
      </Source>
      <Source id="route-legs" type="geojson" data={legs}>
        <Layer
          id="route-casing"
          type="line"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{
            "line-color": palette.casing,
            "line-width": legValue(highlightLegs, 11, 9, 9),
            "line-opacity": legValue(highlightLegs, 1, FADED_OPACITY),
          }}
        />
        <Layer
          id="route-line"
          type="line"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{
            "line-color": ["get", "color"],
            "line-width": legValue(highlightLegs, 7, 5, 5),
            "line-opacity": legValue(highlightLegs, 1, FADED_OPACITY),
          }}
        />
        {/* Which way the line goes: chevrons on it in the casing colour, like the line's outline */}
        <Layer
          id="route-direction"
          type="symbol"
          minzoom={13}
          layout={{
            "symbol-placement": "line",
            "symbol-spacing": CHEVRON_SPACING_PX,
            "icon-image": routeChevronImageId(palette.casing),
            "icon-rotation-alignment": "map",
            "icon-pitch-alignment": "map",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          }}
          paint={{ "icon-opacity": legValue(highlightLegs, 1, FADED_OPACITY) }}
        />
      </Source>
      {/* Stops passed on the way: dimmed white dots, to count the stops left to getting off */}
      <Source id="route-passed-stops" type="geojson" data={passed}>
        <Layer
          id="route-passed-stop"
          type="circle"
          minzoom={12}
          paint={{
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 2, 16, 3.5],
            "circle-color": "#ffffff",
            "circle-opacity": legValue(highlightLegs, 0.75, 0.75 * FADED_OPACITY, 0.6),
            "circle-stroke-color": ["get", "color"],
            "circle-stroke-width": 1,
            "circle-stroke-opacity": legValue(highlightLegs, 0.9, FADED_OPACITY, 0.6),
          }}
        />
      </Source>
      <Source id={ROUTE_PLACES_SOURCE_ID} type="geojson" data={places}>
        {hasIcons ? (
          <StickerStops
            theme={stickerLook}
            palette={palette}
            isActive={isActive}
            opacity={placeOpacity}
            selectedId={selectedId}
          />
        ) : (
          <NumberedStops
            palette={palette}
            isActive={isActive}
            opacity={placeOpacity}
            selectedId={selectedId}
          />
        )}
      </Source>
      {/* Where to get off a line before a walk (or at the end): a dot and "106 wysiądź" */}
      <Source id="route-alightings" type="geojson" data={alightings}>
        <Layer
          id="route-alighting-dot"
          type="circle"
          paint={{
            "circle-radius": 6,
            "circle-color": ["get", "color"],
            "circle-stroke-color": palette.labelHalo,
            "circle-stroke-width": 2.5,
            "circle-opacity": alightOpacity,
            "circle-stroke-opacity": alightOpacity,
          }}
        />
        <Layer
          id="route-alighting-chip"
          type="symbol"
          layout={{
            "icon-image": LINE_CHIP_IMAGE,
            "icon-anchor": "bottom",
            "icon-offset": [0, -8],
            "icon-allow-overlap": true,
          }}
          paint={{ "icon-opacity": alightOpacity }}
        />
        <Layer
          id="route-alighting-label"
          type="symbol"
          layout={{
            "text-field": ["get", "stopName"],
            "text-font": LABEL_FONT,
            "text-size": 11.5,
            "text-anchor": "top",
            "text-offset": [0, 0.9],
            "text-max-width": 10,
            "text-optional": true,
          }}
          paint={{
            "text-color": palette.label,
            "text-halo-color": palette.labelHalo,
            "text-halo-width": 1.5,
            "text-opacity": alightOpacity,
          }}
        />
      </Source>
      {/* Start and transfers: a countdown ring in the colour of the line boarded there, its number above;
          over the route places, the countdown matters more while walking to the stop. */}
      <Source id="route-boardings" type="geojson" data={boardings}>
        <Layer
          id="route-boarding-timer"
          type="symbol"
          layout={{
            "icon-image": BOARDING_TIMER_IMAGE,
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          }}
          paint={{ "icon-opacity": boardingOpacity }}
        />
        {/* Over the ring: the line with its vehicle icon, at a transfer "122 → 180" (lib/line-chips.ts) */}
        <Layer
          id="route-boarding-line"
          type="symbol"
          layout={{
            "icon-image": LINE_CHIP_IMAGE,
            "icon-anchor": "bottom",
            "icon-offset": [0, -16],
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          }}
          paint={{ "icon-opacity": boardingOpacity }}
        />
        {/* Below the ring: where the line is boarded and, while it counts down, the clock time. */}
        <Layer
          id="route-boarding-label"
          type="symbol"
          layout={{
            "text-field": [
              "case",
              ["==", ["get", "time"], ""],
              ["get", "stopName"],
              ["format", ["get", "stopName"], {}, "\n", {}, ["get", "time"], { "font-scale": 0.9 }],
            ],
            "text-font": LABEL_FONT,
            "text-size": 12,
            "text-anchor": "top",
            "text-offset": [0, 1.75],
            "text-max-width": 10,
          }}
          paint={{
            "text-color": palette.label,
            "text-halo-color": palette.labelHalo,
            "text-halo-width": 1.5,
            "text-opacity": boardingOpacity,
          }}
        />
      </Source>
    </>
  );
}

type StopsProps = {
  palette: MapPalette;
  isActive: ExpressionSpecification;
  /** 1, or while legs are picked by hand: faded away from them (`placeOpacity`). */
  opacity: number | ExpressionSpecification;
  selectedId: string | null;
};

/**
 * Route places as the sticker of their subkind (as regular places, but larger) with the order
 * number in a badge of the group colour. The place the story is about gets a halo and its name.
 */
function StickerStops({
  theme,
  palette,
  isActive,
  opacity,
  selectedId,
}: StopsProps & { theme: MapLook }) {
  const inactive: FilterSpecification = ["!", isActive];
  return (
    <>
      <Layer
        source={ROUTE_PLACES_SOURCE_ID}
        id="route-places-halo"
        type="circle"
        filter={isActive}
        paint={{
          "circle-radius": 24,
          "circle-color": ACTIVE_STOP_COLOR,
          "circle-opacity": 0.16,
          "circle-stroke-color": ACTIVE_STOP_COLOR,
          "circle-stroke-opacity": 0.45,
          "circle-stroke-width": 2,
        }}
      />
      <Layer
        source={ROUTE_PLACES_SOURCE_ID}
        id={ROUTE_PLACES_LAYER_ID}
        type="symbol"
        layout={{
          "icon-image": placeStickerExpression(theme),
          "icon-size": ["case", isActive, ACTIVE_STICKER_SIZE, STICKER_SIZE],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          // The active sticker is drawn last, over its neighbours.
          "symbol-sort-key": ["case", isActive, 1, 0],
        }}
        paint={{ "icon-opacity": opacity }}
      />
      <Layer
        source={ROUTE_PLACES_SOURCE_ID}
        id="route-places-selected"
        type="circle"
        filter={["==", ["get", "id"], selectedId ?? ""]}
        paint={{
          "circle-radius": 22,
          "circle-opacity": 0,
          "circle-stroke-color": palette.selected,
          "circle-stroke-width": 3,
        }}
      />
      <Layer
        source={ROUTE_PLACES_SOURCE_ID}
        id="route-places-badge"
        type="circle"
        filter={inactive}
        paint={{ ...badgePaint(opacity), "circle-translate": BADGE_OFFSET }}
      />
      <Layer
        source={ROUTE_PLACES_SOURCE_ID}
        id="route-places-badge-active"
        type="circle"
        filter={isActive}
        paint={{ ...badgePaint(opacity), "circle-translate": ACTIVE_BADGE_OFFSET }}
      />
      <Layer
        source={ROUTE_PLACES_SOURCE_ID}
        id="route-places-order"
        type="symbol"
        layout={{
          "text-field": ["to-string", ["get", "order"]],
          "text-font": LABEL_FONT_BOLD,
          "text-size": BADGE_TEXT_SIZE,
          "text-offset": [
            "case",
            isActive,
            ["literal", ACTIVE_BADGE_OFFSET.map((px) => px / BADGE_TEXT_SIZE)],
            ["literal", BADGE_OFFSET.map((px) => px / BADGE_TEXT_SIZE)],
          ],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        }}
        paint={{ "text-color": "#ffffff", "text-opacity": opacity }}
      />
      <Layer
        source={ROUTE_PLACES_SOURCE_ID}
        id="route-places-active-name"
        type="symbol"
        filter={isActive}
        layout={{
          "text-field": ["get", "name"],
          "text-font": LABEL_FONT_BOLD,
          "text-size": 12,
          "text-anchor": "top",
          "text-offset": [0, 2.2],
          "text-max-width": 12,
        }}
        paint={{
          "text-color": palette.activeLabel,
          "text-halo-color": palette.labelHalo,
          "text-halo-width": 2,
        }}
      />
    </>
  );
}

function badgePaint(opacity: number | ExpressionSpecification) {
  return {
    "circle-radius": 8,
    "circle-color": placeKindColorExpression(),
    "circle-opacity": opacity,
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 2,
    "circle-stroke-opacity": opacity,
    // Offset on screen like the sticker and the number; "map" turned the badge away when rotated.
    "circle-translate-anchor": "viewport",
  } as const;
}

/** Without icons: numbered circles, the active one in the accent colour. */
function NumberedStops({ palette, isActive, opacity, selectedId }: StopsProps) {
  return (
    <>
      <Layer
        source={ROUTE_PLACES_SOURCE_ID}
        id={ROUTE_PLACES_LAYER_ID}
        type="circle"
        paint={{
          "circle-radius": ["case", isActive, 14, 11],
          "circle-color": ["case", isActive, ACTIVE_STOP_COLOR, palette.stopFill],
          "circle-opacity": opacity,
          "circle-stroke-color": palette.ring,
          "circle-stroke-width": 2,
          "circle-stroke-opacity": opacity,
        }}
      />
      <Layer
        source={ROUTE_PLACES_SOURCE_ID}
        id="route-places-selected"
        type="circle"
        filter={["==", ["get", "id"], selectedId ?? ""]}
        paint={{
          "circle-radius": 15,
          "circle-opacity": 0,
          "circle-stroke-color": palette.selected,
          "circle-stroke-width": 3,
        }}
      />
      <Layer
        source={ROUTE_PLACES_SOURCE_ID}
        id="route-places-order"
        type="symbol"
        layout={{
          "text-field": ["to-string", ["get", "order"]],
          "text-font": LABEL_FONT,
          "text-size": 12,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        }}
        paint={{
          "text-color": ["case", isActive, "#ffffff", palette.stopText],
          "text-opacity": opacity,
        }}
      />
    </>
  );
}

/** Current time in ms, updated every `intervalMs`. */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
