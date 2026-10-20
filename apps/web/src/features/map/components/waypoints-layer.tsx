import type { LatLng } from "@sawa/shared";
import { Marker } from "react-map-gl/maplibre";
import { useT } from "@/features/i18n";

/** Stops on the way (issue #195): numbered pins in the order the route passes them. */
export function WaypointsLayer({ points }: { points: readonly (LatLng & { name?: string })[] }) {
  const t = useT();
  return points.map((point, index) => (
    <Marker
      // biome-ignore lint/suspicious/noArrayIndexKey: the number on the pin is its place in the order
      key={index}
      longitude={point.lng}
      latitude={point.lat}
      anchor="center"
    >
      <span
        role="img"
        aria-label={t(
          `Przystanek ${index + 1}${point.name ? `: ${point.name}` : ""}`,
          `Stop ${index + 1}${point.name ? `: ${point.name}` : ""}`,
        )}
        className="pointer-events-none flex size-7 items-center justify-center rounded-full border-[3px] border-white bg-glebia text-[13px] font-extrabold text-white shadow-md"
      >
        {index + 1}
      </span>
    </Marker>
  ));
}
