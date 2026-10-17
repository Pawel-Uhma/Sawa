import type { Pattern } from "../../routing/types";
import { toPatternGeometry } from "../along";
import { pointAtAlong } from "../track";
import type { VehicleHistory } from "../types";

/** Tram 9 running east along lat 52.23: 11 stops ~340 m apart, 60 s between stops. */
const STOPS = 11;
const LNG_STEP = 0.005;
const SEC_PER_STOP = 60;

const lngLats = Array.from(
  { length: STOPS },
  (_, i) => [21 + i * LNG_STEP, 52.23] as [number, number],
);
const base = toPatternGeometry({
  id: "9:1",
  line: "9",
  mode: "tram",
  headsign: "East",
  stops: [],
  lngLats,
  headwaySec: 600,
});

export const PATTERN: Pattern = {
  ...base.pattern,
  stops: base.cumDistM.map((alongM, i) => ({ stopId: `S${i}`, atSec: i * SEC_PER_STOP, alongM })),
};
export const GEOMETRY = toPatternGeometry(PATTERN);
export const STOP_M = GEOMETRY.cumDistM[1] as number;
export const NOW_MS = Date.parse("2026-10-17T14:00:00Z");

/** A tram of line 9 seen at [secondsBeforeNow, alongM] (oldest first), `offM` north of the track. */
export function tram(
  id: string,
  samples: [number, number][],
  offM = 0,
  line = "9",
): VehicleHistory {
  return {
    id,
    line,
    mode: "tram",
    brigade: "1",
    samples: samples.map(([secAgo, alongM]) => {
      const [lng, lat] = pointAtAlong(GEOMETRY, alongM);
      return { atMs: NOW_MS - secAgo * 1000, position: { lat: lat + offM / 111_320, lng } };
    }),
  };
}
