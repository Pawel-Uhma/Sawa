import type { LatLng, PlanRouteRequest } from "@sawa/shared";

/** Gdzie kończy się przejażdżka: z powrotem na starcie albo przy wybranym celu. */
export type RideEnd = { type: "loop" } | { type: "destination"; name: string; point: LatLng };

export type RideEndType = RideEnd["type"];

export type DestinationPreset = { id: string; name: string; point: LatLng };

/** Cele do wyboru jednym stuknięciem. Własny cel to stuknięcie w mapę. */
export const DESTINATION_PRESETS: DestinationPreset[] = [
  { id: "stare-miasto", name: "Stare Miasto", point: { lat: 52.2497, lng: 21.0122 } },
  { id: "pkin", name: "Pałac Kultury", point: { lat: 52.2318, lng: 21.006 } },
  { id: "lazienki", name: "Łazienki", point: { lat: 52.2148, lng: 21.0351 } },
  { id: "praga", name: "Praga", point: { lat: 52.2547, lng: 21.0447 } },
];

export const CUSTOM_DESTINATION_NAME = "Punkt na mapie";

/** Pola zapytania do planera dla wybranego końca trasy. */
export function rideEndRequest(
  end: RideEnd,
): Pick<PlanRouteRequest, "returnToStart" | "destination"> {
  switch (end.type) {
    case "loop":
      return { returnToStart: true };
    case "destination":
      return { returnToStart: false, destination: end.point };
  }
}
