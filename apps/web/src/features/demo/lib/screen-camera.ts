import type { LatLng } from "@sawa/shared";
import type { MapCamera } from "@/features/map";

export type ScreenCameraInput = {
  /** Karta miejsca jest otwarta; `position` to null, dopóki szczegóły miejsca się nie wczytają. */
  place: { position: LatLng | null } | null;
  /** Punkt trasy, o którym teraz mowa (tylko na ekranie trasy). */
  activeStop: LatLng | null;
  /** Wybrany cel na ekranie głównym. */
  destination: LatLng | null;
  origin: LatLng;
  isDesktop: boolean;
};

/** Zoom ekranu trasy przy aktywnym punkcie i ekranu głównego bez celu. */
const ROUTE_STOP_ZOOM = 15.4;
const HOME_ZOOM = { desktop: 15.3, phone: 14.8 };
const HOME_FIT_MAX_ZOOM = 15;

/** Co mapa pokazuje na danym ekranie. */
export function screenCamera({
  place,
  activeStop,
  destination,
  origin,
  isDesktop,
}: ScreenCameraInput): MapCamera {
  if (place) {
    // Wybrane miejsce jedzie nad kartę; zoom zostaje taki, jaki ustawił użytkownik.
    // Zanim dojdzie pozycja, kamera stoi: inaczej najpierw wraca na start, a potem jedzie
    // do miejsca, czyli dwa ruchy zamiast jednego (#117).
    return place.position ? { type: "center", center: place.position } : { type: "stay" };
  }
  if (activeStop) return { type: "center", center: activeStop, zoom: ROUTE_STOP_ZOOM };
  // Wybrany cel: mapa pokazuje start i cel naraz
  if (destination) {
    return { type: "fit", points: [origin, destination], maxZoom: HOME_FIT_MAX_ZOOM };
  }
  return {
    type: "center",
    center: origin,
    zoom: isDesktop ? HOME_ZOOM.desktop : HOME_ZOOM.phone,
  };
}
