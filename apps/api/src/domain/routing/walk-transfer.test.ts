import { describe, expect, it } from "vitest";
import { planRide } from "./beam-search";
import { cumulativeDistancesM } from "./geometry";
import { createNetwork } from "./network";
import { computePlaceHits } from "./place-hits";
import type { LngLat, NetworkStop, Pattern, PlacePoint } from "./types";

/**
 * Tram P runs east along lat 52.230; bus Q runs north from a stop ~170 m north of P5, in its
 * own stop group. Places are only along Q, so the best ride walks over from P5 to Q0.
 */
function line(id: string, at: (i: number) => LngLat, n: number) {
  const lngLats = Array.from({ length: n }, (_, i) => at(i));
  const cum = cumulativeDistancesM(lngLats);
  const stops: NetworkStop[] = lngLats.map(([lng, lat], i) => ({
    id: `${id}${i}`,
    groupId: `${id}${i}`,
    name: `${id} ${i}`,
    position: { lat, lng },
  }));
  const pattern: Pattern = {
    id: `${id}-0`,
    line: id,
    mode: "tram",
    headsign: `${id} end`,
    stops: stops.map((s, i) => ({ stopId: s.id, atSec: i * 90, alongM: cum[i] as number })),
    lngLats,
    headwaySec: 600,
  };
  return { stops, pattern };
}

const p = line("P", (i) => [21.0 + i * 0.004, 52.23], 10);
const q = line("Q", (i) => [21.02, 52.2315 + i * 0.003], 12);
const network = createNetwork([...p.stops, ...q.stops], [p.pattern, q.pattern]);
const PLACES: PlacePoint[] = [6, 8, 10].map((i) => ({
  id: `q-${i}`,
  name: `q-${i}`,
  position: { lat: 52.2315 + i * 0.003, lng: 21.0201 },
  interests: ["history"],
  weight: 1,
}));

describe("walking transfers", () => {
  const input = {
    network,
    hitsByPattern: computePlaceHits(network, PLACES),
    placesById: new Map(PLACES.map((pl) => [pl.id, pl])),
    origin: { lat: 52.2301, lng: 21.0 },
    budgetSec: 30 * 60,
    interests: new Set(["history"]),
  };

  it("walks to a nearby stop group to change lines", () => {
    const ride = planRide(input);
    expect(ride?.legs.map((l) => l.patternId)).toEqual(["P-0", "Q-0"]);
    expect(ride?.legs[1]?.walkBeforeSec).toBeGreaterThan(100);
    // 30 min reach the first place on Q.
    expect(ride?.places.map((pl) => pl.placeId)).toEqual(["q-6"]);
  });

  it("does not walk farther than allowed", () => {
    const ride = planRide(input, { walkTransferM: 100 });
    expect(ride?.legs.map((l) => l.patternId)).toEqual(["P-0"]);
  });
});
