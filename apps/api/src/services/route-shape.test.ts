import { HACKATHON_VENUE, haversineM, type Route } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { loadTransitCalendar } from "../adapters/gtfs/load-transit";
import { createFilePlacesRepository } from "../adapters/places-file/file-places-repository";
import { cumulativeDistancesM, slicePolyline } from "../domain/routing/geometry";
import { createRoutePlanner } from "./plan-route";

// Real data: every drawn leg must start and end at its stops (no jumps across the city).
const transit = loadTransitCalendar(new URL("../../data/transit/", import.meta.url)).forDate(
  "2026-10-17",
);
const places = createFilePlacesRepository(new URL("../../data/places.geojson", import.meta.url));
const planner = createRoutePlanner({ transit, places });
const NOW = new Date("2026-10-17T14:00:00+02:00");

const toLatLng = ([lng, lat]: [number, number]) => ({ lat, lng });

function legEndOffsetsM(route: Route): number[] {
  return route.legs.flatMap((leg) => {
    const first = leg.lngLats[0] as [number, number];
    const last = leg.lngLats[leg.lngLats.length - 1] as [number, number];
    return [
      haversineM(toLatLng(first), leg.fromStop.position),
      haversineM(toLatLng(last), leg.toStop.position),
    ];
  });
}

describe("leg shapes on real data", () => {
  it.each([
    [60, false],
    [120, true],
    [240, true],
  ])("%i min (loop %s): shapes start and end at their stops", async (durationMin, loop) => {
    const route = await planner.plan(
      { origin: HACKATHON_VENUE, durationMin, interests: ["historical"], returnToStart: loop },
      NOW,
    );
    for (const offset of legEndOffsetsM(route)) expect(offset).toBeLessThan(100);
  });

  it("slices every line to its last stop without wrapping to the start", () => {
    const far: string[] = [];
    for (const pattern of transit.network.patterns.values()) {
      const first = pattern.stops[0];
      const last = pattern.stops[pattern.stops.length - 1];
      const lastStop = transit.network.stops.get(last?.stopId ?? "");
      if (!first || !last || !lastStop) continue;
      const cum = cumulativeDistancesM(pattern.lngLats);
      const slice = slicePolyline(pattern.lngLats, cum, first.alongM, last.alongM);
      const end = slice[slice.length - 1] as [number, number];
      if (haversineM(toLatLng(end), lastStop.position) > 300) far.push(pattern.id);
    }
    expect(far).toEqual([]);
  });
});
