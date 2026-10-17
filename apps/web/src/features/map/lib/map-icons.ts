import type { Map as MapLibreMap } from "maplibre-gl";
import { MAP_ICON_PIXEL_RATIO, MAP_ICONS, mapIconId, mapIconUrl } from "./map-style";

/**
 * Registers the map icons in the style. Resolves to false when any icon fails,
 * so the layers can fall back to coloured dots instead of drawing nothing.
 */
export async function loadMapIcons(map: MapLibreMap): Promise<boolean> {
  try {
    await Promise.all(
      MAP_ICONS.map(async (name) => {
        if (map.hasImage(mapIconId(name))) return;
        const { data } = await map.loadImage(mapIconUrl(name));
        if (!map.hasImage(mapIconId(name))) {
          map.addImage(mapIconId(name), data, { pixelRatio: MAP_ICON_PIXEL_RATIO });
        }
      }),
    );
    return true;
  } catch (error) {
    console.error("map icons failed to load", error);
    return false;
  }
}
