import type { LatLng, PlanRouteRequest } from "@sawa/shared";

/** Gdzie kończy się przejażdżka: z powrotem na starcie albo przy wybranym celu. */
export type RideEnd =
  | { type: "loop" }
  | { type: "destination"; name: string; address?: string; point: LatLng };

export type RideEndType = RideEnd["type"];

export const CUSTOM_DESTINATION_NAME = "Punkt na mapie";
export const CUSTOM_DESTINATION_NAME_EN = "Point on the map";

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
