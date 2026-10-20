import { HACKATHON_VENUE, type Route, RouteSchema } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { loadTransitCalendar } from "../adapters/gtfs/load-transit";
import { createFilePlacesRepository } from "../adapters/places-file/file-places-repository";
import { createRoutePlanner } from "./plan-route";

// Integration test on the committed data files (real Warsaw network and places).
const transit = loadTransitCalendar(new URL("../../data/transit/", import.meta.url)).forDate(
  "2026-10-17",
);
const places = createFilePlacesRepository(new URL("../../data/places.geojson", import.meta.url));
const NOW = new Date("2026-10-17T14:00:00+02:00");

/** Rides that follow each other directly, with no walk between them. */
function directTransfers(route: Route) {
  return route.legs.flatMap((leg, i) => {
    const next = route.legs[i + 1];
    return leg.mode !== "walk" && next && next.mode !== "walk" ? [[leg, next] as const] : [];
  });
}

describe("transfers on transit rides", () => {
  it.each([60, 90, 120])("walks between different stops on a %i min loop", async (durationMin) => {
    const planner = createRoutePlanner({ transit, places });
    const route = RouteSchema.parse(
      await planner.plan(
        {
          origin: HACKATHON_VENUE,
          durationMin,
          returnToStart: true,
          interests: ["historical"],
          travel: "transit",
        },
        NOW,
      ),
    );
    // A ride straight after another one starts where it ended; elsewhere there is a walk leg
    for (const [leg, next] of directTransfers(route)) {
      expect(next.fromStop.id).toBe(leg.toStop.id);
    }
    // A transfer walk joins the stops it is between and starts when the ride ends
    route.legs.forEach((leg, i) => {
      const prev = route.legs[i - 1];
      const next = route.legs[i + 1];
      if (leg.mode !== "walk" || !prev || !next || prev.mode === "walk") return;
      expect(leg.fromStop.id).toBe(prev.toStop.id);
      expect(leg.toStop.id).toBe(next.fromStop.id);
      const alight = Date.parse(prev.departAt) + prev.durationMin * 60_000;
      expect(Math.abs(Date.parse(leg.departAt) - alight)).toBeLessThan(60_000);
    });
    // Every place still belongs to a leg of the route
    for (const place of route.places) {
      expect(route.legs[place.legIndex]).toBeDefined();
    }
  });
});
