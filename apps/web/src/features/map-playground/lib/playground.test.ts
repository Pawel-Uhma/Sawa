import { HACKATHON_VENUE } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { cameraForPreset, DEFAULT_PADDING } from "./playground-state";
import { buildUsageSnippet, type SnippetProps } from "./usage-snippet";

const STOP = { lat: 52.237, lng: 20.98 };

describe("cameraForPreset", () => {
  it("leaves the camera to SawaMap in auto mode", () => {
    expect(cameraForPreset("auto", { zoom: 16 })).toBeUndefined();
  });

  it("centres on the venue or the active stop with the chosen zoom", () => {
    expect(cameraForPreset("venue", { zoom: 15 })).toEqual({
      type: "center",
      center: HACKATHON_VENUE,
      zoom: 15,
    });
    expect(cameraForPreset("active", { zoom: 17, activeStop: STOP })).toEqual({
      type: "center",
      center: STOP,
      zoom: 17,
    });
  });

  it("fits whatever of user and active stop exists", () => {
    expect(
      cameraForPreset("user-and-active", { zoom: 17, user: HACKATHON_VENUE, activeStop: STOP }),
    ).toEqual({ type: "fit", points: [HACKATHON_VENUE, STOP], maxZoom: 17 });
    expect(cameraForPreset("user-and-active", { zoom: 17 })).toBeUndefined();
  });
});

const BASE: SnippetProps = {
  interests: [],
  hasRoute: false,
  padding: DEFAULT_PADDING,
  isStopClickHandled: false,
  hasPlaceSheet: true,
  hasZoomControls: true,
};

describe("buildUsageSnippet", () => {
  it("omits props left at their defaults", () => {
    expect(buildUsageSnippet(BASE)).toBe("<SawaMap\n  interests={[]}\n/>");
  });

  it("writes every changed prop as copyable JSX", () => {
    const snippet = buildUsageSnippet({
      ...BASE,
      interests: ["historical"],
      hasRoute: true,
      camera: { type: "center", center: HACKATHON_VENUE, zoom: 16 },
      padding: { ...DEFAULT_PADDING, bottom: 380 },
      user: HACKATHON_VENUE,
      activeStopId: "kercelak",
      isStopClickHandled: true,
      hasPlaceSheet: false,
      hasZoomControls: false,
    });
    expect(snippet).toBe(
      [
        "<SawaMap",
        '  interests={["historical"]}',
        "  route={route}",
        '  camera={{ type: "center", center: { lat: 52.2359, lng: 20.9789 }, zoom: 16 }}',
        "  padding={{ bottom: 380 }}",
        "  user={{ lat: 52.2359, lng: 20.9789 }}",
        '  activeStopId="kercelak"',
        "  onStopClick={(placeId) => setActiveStop(placeId)}",
        "  hasPlaceSheet={false}",
        "  hasZoomControls={false}",
        "/>",
      ].join("\n"),
    );
  });
});
