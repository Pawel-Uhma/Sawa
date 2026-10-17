import {
  HACKATHON_VENUE,
  haversineM,
  INTERESTS,
  type LatLng,
  type PlanRouteRequest,
  type Route,
  RouteSchema,
  toLngLat,
} from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { loadTransitData } from "../adapters/gtfs/load-transit";
import { createFilePlacesRepository } from "../adapters/places-file/file-places-repository";
import { createRoutePlanner } from "./plan-route";
import type { DepartureSource, LiveBoardingSource, WalkPathSource } from "./ports";

// Integration test on the committed data files (real Warsaw network and places).
const transit = loadTransitData(new URL("../../data/transit-graph.json.gz", import.meta.url));
const places = createFilePlacesRepository(new URL("../../data/places.geojson", import.meta.url));
/** Tram and bus legs, without the walks to and from the stops. */
const rideLegs = (route: Route) => route.legs.filter((l) => l.mode !== "walk");
const NOW = new Date("2026-10-17T14:00:00+02:00");

describe("route planner on real data", () => {
  const planner = createRoutePlanner({ transit, places });

  it.each([
    30, 60, 120,
  ])("plans a %i-minute ride from 42 Warsaw past places", async (durationMin) => {
    const started = performance.now();
    const route = RouteSchema.parse(
      await planner.plan(
        { origin: HACKATHON_VENUE, durationMin, interests: ["historical", "cultural"] },
        NOW,
      ),
    );
    expect(performance.now() - started).toBeLessThan(2000);
    expect(rideLegs(route).length).toBeGreaterThan(0);
    expect(rideLegs(route).length).toBeLessThanOrEqual(3);
    expect(route.places.length).toBeGreaterThanOrEqual(3);
    expect(route.totalMin).toBeLessThanOrEqual(durationMin * 1.1);
  });

  it("answers NOT_FOUND far from any stop", async () => {
    await expect(
      planner.plan(
        { origin: { lat: 52.9, lng: 22.5 }, durationMin: 60, interests: ["historical"] },
        NOW,
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it.each([60, 120])("plans a %i-minute loop that ends near the start", async (durationMin) => {
    const route = RouteSchema.parse(
      await planner.plan(
        { origin: HACKATHON_VENUE, durationMin, interests: ["historical"], returnToStart: true },
        NOW,
      ),
    );
    expect(route.endsAtStart).toBe(true);
    const end = route.legs[route.legs.length - 1]?.toStop.position;
    expect(end && haversineM(end, HACKATHON_VENUE)).toBeLessThanOrEqual(600);
    expect(route.totalMin).toBeGreaterThanOrEqual(durationMin * 0.8);
    expect(route.totalMin).toBeLessThanOrEqual(durationMin * 1.1);
  });

  it("spaces stories by the chosen story style", async () => {
    const plan = (storyStyle: "trivia" | "deep") =>
      planner.plan(
        { origin: HACKATHON_VENUE, durationMin: 60, interests: ["historical"], storyStyle },
        NOW,
      );
    const [trivia, deep] = await Promise.all([plan("trivia"), plan("deep")]);
    expect(deep.places.length).toBeLessThan(trivia.places.length);
    const gaps = deep.places.slice(1).map((p, i) => p.etaSec - (deep.places[i]?.etaSec ?? 0));
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(89);
  });

  it("moves on to other places once the listener heard everything on the first ride", async () => {
    const all = await places.listInBBox({ minLng: 20, minLat: 52, maxLng: 22, maxLat: 53 });
    const richness = new Map(all.map((p) => [p.id, p.richness]));
    const ask = (heard?: Record<string, number>) =>
      planner.plan(
        { origin: HACKATHON_VENUE, durationMin: 60, interests: ["historical"], heard },
        NOW,
      );
    const first = await ask();
    const heard = Object.fromEntries(
      first.places.map((p) => [p.placeId, richness.get(p.placeId) ?? 1]),
    );
    const second = await ask(heard);
    const repeated = second.places.filter((p) => p.placeId in heard).length;
    expect(repeated).toBeLessThan(second.places.length / 2);
  });

  it.each(INTERESTS)("finds places for a single category: %s", async (interest) => {
    const route = await planner.plan(
      { origin: HACKATHON_VENUE, durationMin: 60, interests: [interest] },
      NOW,
    );
    expect(route.places.length).toBeGreaterThan(0);
  });

  it.each([60, 120])("plans a %i-minute walk when the user picked walking", async (durationMin) => {
    const route = RouteSchema.parse(
      await planner.plan(
        { origin: HACKATHON_VENUE, durationMin, interests: ["historical"], travel: "walk" },
        NOW,
      ),
    );
    expect(route.legs.map((l) => l.mode)).toEqual(["walk"]);
    expect(route.places.length).toBeGreaterThan(0);
  });

  it("plans a ride when the user picked transit, even for a walk-length time", async () => {
    const route = RouteSchema.parse(
      await planner.plan(
        { origin: HACKATHON_VENUE, durationMin: 60, interests: ["historical"], travel: "transit" },
        NOW,
      ),
    );
    expect(rideLegs(route).length).toBeGreaterThan(0);
  });

  it.each([5, 10])("plans a %i-minute walk past places", async (durationMin) => {
    const route = RouteSchema.parse(
      await planner.plan({ origin: HACKATHON_VENUE, durationMin, interests: ["historical"] }, NOW),
    );
    expect(route.legs.map((l) => l.mode)).toEqual(["walk"]);
    expect(route.totalMin).toBeLessThanOrEqual(durationMin * 1.1);
    expect(route.places.length).toBeGreaterThan(0);
  });

  it("shows the walk to the first stop and puts each place on the leg it is passed on", async () => {
    const route = await planner.plan(
      { origin: HACKATHON_VENUE, durationMin: 60, interests: ["historical"] },
      NOW,
    );
    expect(route.legs[0]?.mode).toBe("walk");
    expect(route.legs[0]?.fromStop.position).toEqual(HACKATHON_VENUE);
    expect(route.legs[0]?.toStop.id).toBe(route.legs[1]?.fromStop.id);
    const walkSec = (route.legs[0]?.durationMin ?? 0) * 60;
    for (const p of route.places) {
      // Places on the walk come before boarding; the rest are on ride legs.
      // `durationMin` is rounded to 0.1 min (6 s).
      expect(route.legs[p.legIndex]?.mode === "walk").toBe(p.etaSec <= walkSec + 6);
    }
  });

  it("starts telling stories on the walk to the first stop", async () => {
    const route = await planner.plan(
      { origin: HACKATHON_VENUE, durationMin: 60, interests: ["historical", "cultural"] },
      NOW,
    );
    expect(route.places[0]?.legIndex).toBe(0);
    expect(route.places[0]?.etaSec).toBeLessThan(6 * 60);
  });

  it.each([
    ["trivia", 30, 60],
    ["fun", 45, 120],
    ["deep", 90, 300],
  ] as const)("keeps %s stories between %i and %i s", async (storyStyle, min, max) => {
    for (const durationMin of [5, 30, 120]) {
      const route = await planner.plan(
        { origin: HACKATHON_VENUE, durationMin, interests: ["historical"], storyStyle },
        NOW,
      );
      for (const p of route.places) {
        expect(p.windowSec).toBeGreaterThanOrEqual(min);
        expect(p.windowSec).toBeLessThanOrEqual(max);
      }
    }
  });

  it("walks from the last stop back to the start of a loop", async () => {
    const route = await planner.plan(
      { origin: HACKATHON_VENUE, durationMin: 60, interests: ["historical"], returnToStart: true },
      NOW,
    );
    const last = route.legs[route.legs.length - 1];
    expect(last?.mode).toBe("walk");
    expect(last?.toStop.position).toEqual(HACKATHON_VENUE);
  });

  it("plans the fastest way to the Castle Square without a duration", async () => {
    const castleSquare = { lat: 52.2477, lng: 21.0137 };
    const plan = (durationMin?: number) =>
      planner.plan(
        {
          origin: HACKATHON_VENUE,
          interests: ["historical"],
          destination: castleSquare,
          durationMin,
        },
        NOW,
      );
    const fastest = RouteSchema.parse(await plan());
    const scenic = await plan(60);
    expect(fastest.endsAtDestination).toBe(true);
    expect(fastest.legs[fastest.legs.length - 1]?.toStop.position).toEqual(castleSquare);
    expect(fastest.totalMin).toBeLessThan(scenic.totalMin);
    expect(fastest.totalMin).toBeLessThan(30);
  });

  it("walks to the destination without a duration when the user picked walking", async () => {
    const castleSquare = { lat: 52.2477, lng: 21.0137 };
    const route = RouteSchema.parse(
      await planner.plan(
        {
          origin: HACKATHON_VENUE,
          interests: ["historical"],
          destination: castleSquare,
          travel: "walk",
        },
        NOW,
      ),
    );
    expect(route.legs.map((l) => l.mode)).toEqual(["walk"]);
    expect(route.endsAtDestination).toBe(true);
  });

  it("takes the fastest ride when a timed ride cannot reach the destination", async () => {
    const wilanow = { lat: 52.1652, lng: 21.0907 };
    const route = await planner.plan(
      { origin: HACKATHON_VENUE, durationMin: 60, interests: ["historical"], destination: wilanow },
      NOW,
    );
    expect(route.endsAtDestination).toBe(true);
  });

  it("plans a ride that ends at the Castle Square", async () => {
    const castleSquare = { lat: 52.2477, lng: 21.0137 };
    const route = RouteSchema.parse(
      await planner.plan(
        {
          origin: HACKATHON_VENUE,
          durationMin: 60,
          interests: ["historical"],
          destination: castleSquare,
        },
        NOW,
      ),
    );
    expect(route.endsAtDestination).toBe(true);
    const end = route.legs[route.legs.length - 1]?.toStop.position;
    expect(end && haversineM(end, castleSquare)).toBeLessThanOrEqual(600);
    expect(route.totalMin).toBeLessThanOrEqual(60 * 1.1);
    const lines = rideLegs(route).map((l) => l.line);
    expect(new Set(lines).size).toBe(lines.length);
  });

  it.each([30, 60, 90])("rides at least 3 minutes on every leg (%i min)", async (durationMin) => {
    const route = await planner.plan(
      { origin: { lat: 52.2297, lng: 20.9719 }, durationMin, interests: ["historical"] },
      NOW,
    );
    for (const leg of rideLegs(route)) expect(leg.durationMin).toBeGreaterThanOrEqual(3);
  });

  it("moves every leg to a real departure", async () => {
    // A departure every 7 minutes from :03, on every platform and line.
    const departures: DepartureSource = {
      departures: async (_stop, _line, day) =>
        Array.from({ length: 200 }, (_, i) => new Date(day.getTime() + (3 + 7 * i) * 60_000)),
    };
    const withReal = createRoutePlanner({ transit, places, departures });
    const route = RouteSchema.parse(
      await withReal.plan(
        { origin: HACKATHON_VENUE, durationMin: 60, interests: ["historical"] },
        NOW,
      ),
    );
    for (const leg of rideLegs(route)) {
      expect(leg.realDeparture).toBe(true);
      const min = (new Date(leg.departAt).getTime() - NOW.getTime()) / 60_000;
      expect((min - 3) % 7).toBeCloseTo(0);
    }
  });

  it("estimates departures when the timetable is unknown", async () => {
    const departures: DepartureSource = { departures: async () => undefined };
    const route = await createRoutePlanner({ transit, places, departures }).plan(
      { origin: HACKATHON_VENUE, durationMin: 60, interests: ["historical"] },
      NOW,
    );
    expect(route.legs.every((l) => l.realDeparture === undefined)).toBe(true);
  });

  it("draws walking legs along the paths from the walk router, keeping the times", async () => {
    const asked: LatLng[][] = [];
    const walkPaths: WalkPathSource = {
      path: async (points) => {
        asked.push(points);
        const [a, b] = [points[0] as LatLng, points[points.length - 1] as LatLng];
        // An L-shaped "street" between the ends.
        return [toLngLat(a), [b.lng, a.lat], toLngLat(b)];
      },
    };
    const request: PlanRouteRequest = {
      origin: HACKATHON_VENUE,
      durationMin: 60,
      interests: ["historical"],
    };
    const straight = await planner.plan(request, NOW);
    const route = RouteSchema.parse(
      await createRoutePlanner({ transit, places, walkPaths }).plan(request, NOW),
    );
    const walks = route.legs.filter((l) => l.mode === "walk");
    expect(walks.length).toBeGreaterThan(0);
    expect(asked).toHaveLength(walks.length);
    for (const leg of walks) expect(leg.lngLats).toHaveLength(3);
    expect(route.legs.map((l) => l.durationMin)).toEqual(straight.legs.map((l) => l.durationMin));
    expect(route.places).toEqual(straight.places);
  });

  it("keeps straight walking legs when the walk router has no path", async () => {
    const walkPaths: WalkPathSource = { path: async () => undefined };
    const request: PlanRouteRequest = {
      origin: HACKATHON_VENUE,
      durationMin: 10,
      interests: ["historical"],
    };
    const route = await createRoutePlanner({ transit, places, walkPaths }).plan(request, NOW);
    expect(route).toEqual(await planner.plan(request, NOW));
  });

  it.each([
    30, 60, 90,
  ])("never transfers to ride shorter than the wait on a free %i-minute ride", async (durationMin) => {
    const route = await planner.plan(
      { origin: { lat: 52.2297, lng: 20.9719 }, durationMin, interests: ["historical"] },
      NOW,
    );
    // Half the headway is at least 1 min; with the 2-min transfer that is over 3 min.
    for (const leg of rideLegs(route).slice(1)) expect(leg.durationMin).toBeGreaterThan(3);
  });

  describe("live delay of the first vehicle", () => {
    const REQUEST = {
      origin: HACKATHON_VENUE,
      durationMin: 60,
      interests: ["historical" as const],
    };
    /** The vehicle reaches the boarding stop `sec` after the planned departure. */
    const late = (sec: number): LiveBoardingSource => ({
      boardAtMs: async (leg) => Date.parse(leg.departAt) + sec * 1000,
    });
    const firstRide = (route: Route) => rideLegs(route)[0];

    it("moves the ride by the delay and credits the city's data", async () => {
      const onTime = await createRoutePlanner({ transit, places }).plan(REQUEST, NOW);
      const delayed = await createRoutePlanner({ transit, places, live: late(240) }).plan(
        REQUEST,
        NOW,
      );
      expect(firstRide(delayed)?.delaySec).toBe(240);
      const shiftMs =
        Date.parse(firstRide(delayed)?.departAt ?? "") -
        Date.parse(firstRide(onTime)?.departAt ?? "");
      expect(shiftMs).toBe(240_000);
      expect(delayed.attribution.some((a) => a.includes("dane.um.warszawa.pl"))).toBe(true);
    });

    it.each([
      ["no live estimate", { boardAtMs: async () => undefined }],
      ["a delay too large to trust", late(45 * 60)],
      ["a difference within the noise", late(10)],
      ["a vehicle gone before the rider gets there", late(-30 * 60)],
    ] as const)("keeps the timetable for %s", async (_, live) => {
      const route = await createRoutePlanner({ transit, places, live }).plan(REQUEST, NOW);
      expect(firstRide(route)?.delaySec).toBeUndefined();
    });
  });
});
