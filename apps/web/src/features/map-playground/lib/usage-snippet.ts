import type { LatLng } from "@sawa/shared";
import type { MapCamera, MapPadding } from "@/features/map";
import { DEFAULT_PADDING } from "./playground-state";

export type SnippetProps = {
  hasRoute: boolean;
  camera?: MapCamera;
  padding: MapPadding;
  user?: LatLng;
  activeStopId?: string;
  isStopClickHandled: boolean;
  hasPlaceSheet: boolean;
  hasZoomControls: boolean;
};

const PADDING_SIDES = ["top", "right", "bottom", "left"] as const;

const round = (n: number) => Math.round(n * 1e5) / 1e5;
const latLng = (p: LatLng) => `{ lat: ${round(p.lat)}, lng: ${round(p.lng)} }`;

function cameraLiteral(camera: MapCamera): string {
  switch (camera.type) {
    case "route":
      return `{ type: "route" }`;
    case "stay":
      return `{ type: "stay" }`;
    case "center": {
      const zoom = camera.zoom === undefined ? "" : `, zoom: ${camera.zoom}`;
      return `{ type: "center", center: ${latLng(camera.center)}${zoom} }`;
    }
    case "fit": {
      const maxZoom = camera.maxZoom === undefined ? "" : `, maxZoom: ${camera.maxZoom}`;
      return `{ type: "fit", points: [${camera.points.map(latLng).join(", ")}]${maxZoom} }`;
    }
  }
}

/** Padding sides that differ from SawaMap's default; null when it is the default. */
function paddingLiteral(padding: MapPadding): string | null {
  const sides = PADDING_SIDES.filter((side) => padding[side] !== DEFAULT_PADDING[side]);
  if (sides.length === 0) return null;
  return `{ ${sides.map((side) => `${side}: ${padding[side]}`).join(", ")} }`;
}

/** JSX for the current playground settings; props left at their defaults are omitted. */
export function buildUsageSnippet(props: SnippetProps): string {
  const lines: string[] = [];
  if (props.hasRoute) lines.push("route={route}");
  if (props.camera) lines.push(`camera={${cameraLiteral(props.camera)}}`);
  const padding = paddingLiteral(props.padding);
  if (padding) lines.push(`padding={${padding}}`);
  if (props.user) lines.push(`user={${latLng(props.user)}}`);
  if (props.activeStopId) lines.push(`activeStopId="${props.activeStopId}"`);
  if (props.isStopClickHandled) lines.push("onStopClick={(placeId) => setActiveStop(placeId)}");
  if (!props.hasPlaceSheet) lines.push("hasPlaceSheet={false}");
  if (!props.hasZoomControls) lines.push("hasZoomControls={false}");
  return `<SawaMap${lines.map((line) => `\n  ${line}`).join("")}\n/>`;
}
