import { describe, expect, it } from "vitest";
import type { Leg } from "./route";
import { trackRequestFromRoute } from "./vehicles";

const stop = (id: string) => ({ id, name: id, position: { lat: 52.23, lng: 21 } });
const leg = (mode: Leg["mode"], line: string): Leg => ({
  line,
  mode,
  headsign: "x",
  fromStop: stop(`${line}a`),
  toStop: stop(`${line}b`),
  departAt: "2026-10-17T14:00:00.000Z",
  durationMin: 5,
  lngLats: [],
});

describe("trackRequestFromRoute", () => {
  it("keeps tram and bus legs with their index in the route", () => {
    const req = trackRequestFromRoute({
      legs: [leg("walk", ""), leg("tram", "9"), leg("bus", "136")],
    });
    expect(req?.legs.map((l) => [l.legIndex, l.line, l.fromStopId])).toEqual([
      [1, "9", "9a"],
      [2, "136", "136a"],
    ]);
  });

  it("returns undefined for a walk only", () => {
    expect(trackRequestFromRoute({ legs: [leg("walk", "")] })).toBeUndefined();
  });
});
