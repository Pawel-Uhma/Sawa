import { cumulativeDistancesM } from "../geometry";
import { createNetwork } from "../network";
import { computePlaceHits } from "../place-hits";
import type { LngLat, Network, NetworkStop, Pattern, PlacePoint } from "../types";

/**
 * Two lines crossing at stop group "X":
 * - tram A runs east along lat 52.230, 20 stops ~270 m apart, 90 s between stops;
 * - bus B runs north along lng 21.012, 20 stops ~330 m apart, 90 s between stops.
 * A3 and B3 are different platforms of group "X".
 */
export const ORIGIN_NEAR_A0 = { lat: 52.2301, lng: 21.0 };
export const ORIGIN_FAR_AWAY = { lat: 52.4, lng: 21.3 };

const SEC_PER_STOP = 90;
const STOPS_PER_LINE = 20;

function line(
  id: string,
  mode: Pattern["mode"],
  positionAt: (i: number) => LngLat,
  groupAt: (i: number) => string,
): { pattern: Pattern; stops: NetworkStop[] } {
  const lngLats = Array.from({ length: STOPS_PER_LINE }, (_, i) => positionAt(i));
  const cum = cumulativeDistancesM(lngLats);
  const stops = lngLats.map(([lng, lat], i) => ({
    id: `${id}${i}`,
    groupId: groupAt(i),
    name: `${id} ${i}`,
    position: { lat, lng },
  }));
  const pattern: Pattern = {
    id: `${id}-0`,
    line: id,
    mode,
    headsign: `${id} end`,
    stops: stops.map((s, i) => ({
      stopId: s.id,
      atSec: i * SEC_PER_STOP,
      alongM: cum[i] as number,
    })),
    lngLats,
    headwaySec: 600,
  };
  return { pattern, stops };
}

export function syntheticNetwork(): Network {
  const a = line(
    "A",
    "tram",
    (i) => [21.0 + i * 0.004, 52.23],
    (i) => (i === 3 ? "X" : `A${i}`),
  );
  const b = line(
    "B",
    "bus",
    (i) => [21.012, 52.221 + i * 0.003],
    (i) => (i === 3 ? "X" : `B${i}`),
  );
  const aBack = reversed(a);
  const bBack = reversed(b);
  return createNetwork(
    [...a.stops, ...b.stops, ...aBack.stops, ...bBack.stops],
    [a.pattern, b.pattern, aBack.pattern, bBack.pattern],
  );
}

/** The same line the other way: opposite platforms (same stop groups), pattern id `<line>-1`. */
function reversed({ pattern, stops }: ReturnType<typeof line>): ReturnType<typeof line> {
  const back = [...stops].reverse().map((s) => ({ ...s, id: `${s.id}r` }));
  const lngLats = [...pattern.lngLats].reverse();
  const cum = cumulativeDistancesM(lngLats);
  return {
    stops: back,
    pattern: {
      ...pattern,
      id: `${pattern.line}-1`,
      headsign: `${pattern.line} start`,
      lngLats,
      stops: back.map((s, i) => ({
        stopId: s.id,
        atSec: i * SEC_PER_STOP,
        alongM: cum[i] as number,
      })),
    },
  };
}

export const place = (
  id: string,
  lng: number,
  lat: number,
  interests: string[],
  weight = 1,
): PlacePoint => ({ id, name: id, position: { lat, lng }, interests, weight });

/** Architecture along A east of the crossing, war history along B north of it. */
export const PLACES: PlacePoint[] = [
  place("a-east-1", 21.03, 52.2302, ["architecture"]),
  place("a-east-2", 21.05, 52.2301, ["architecture"]),
  place("a-east-3", 21.07, 52.2299, ["architecture"]),
  place("b-north-1", 21.0121, 52.236, ["war_uprising"]),
  place("b-north-2", 21.0119, 52.242, ["war_uprising"]),
  place("b-north-3", 21.0122, 52.248, ["war_uprising"]),
  place("crossing", 21.0122, 52.2301, ["architecture", "war_uprising"]),
];

export function searchInput(places: PlacePoint[], interests: string[], budgetMin: number) {
  const network = syntheticNetwork();
  return {
    network,
    hitsByPattern: computePlaceHits(network, places),
    placesById: new Map(places.map((p) => [p.id, p])),
    origin: ORIGIN_NEAR_A0,
    budgetSec: budgetMin * 60,
    interests: new Set(interests),
  };
}
