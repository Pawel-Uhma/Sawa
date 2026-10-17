import { describe, expect, it } from "vitest";
import { addTrip, daytimeHeadwaySec, medianOffsets, type PatternAccumulator } from "./aggregate";
import { csvStream, gtfsTimeToSec, parseCsvLine } from "./csv";
import { lengthM, simplifyLine } from "./simplify";

describe("parseCsvLine", () => {
  it("handles quoted fields with commas and escaped quotes", () => {
    expect(parseCsvLine('1,"Plac Bankowy, Ratusz","say ""hi""",')).toEqual([
      "1",
      "Plac Bankowy, Ratusz",
      'say "hi"',
      "",
    ]);
  });
});

describe("csvStream", () => {
  it("rebuilds rows split across chunks", () => {
    const rows: Record<string, string>[] = [];
    const push = csvStream((r) => rows.push(r));
    const enc = new TextEncoder();
    push(enc.encode("a,b\r\n1,"), false);
    push(enc.encode("2\r\n3,4"), true);
    expect(rows).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });
});

describe("gtfsTimeToSec", () => {
  it("accepts hours past midnight", () => {
    expect(gtfsTimeToSec("25:01:30")).toBe(25 * 3600 + 90);
  });
});

describe("simplifyLine", () => {
  it("drops points closer than the tolerance and keeps corners", () => {
    const line: [number, number][] = [
      [21.0, 52.23],
      [21.001, 52.23001],
      [21.002, 52.23],
      [21.002, 52.231],
    ];
    expect(simplifyLine(line, 5)).toEqual([
      [21.0, 52.23],
      [21.002, 52.23],
      [21.002, 52.231],
    ]);
  });

  it("measures length in metres", () => {
    expect(
      lengthM([
        [21.0, 52.23],
        [21.0, 52.231],
      ]),
    ).toBeCloseTo(111.3, 0);
  });
});

describe("aggregation", () => {
  const trip = { routeId: "10", line: "10", mode: "tram" as const, headsign: "X", shapeId: "s" };
  const stops = (start: number, gaps: number[]) =>
    ["a", "b", "c"].map((stopId, i) => ({
      stopId,
      depSec: start + gaps.slice(0, i).reduce((x, y) => x + y, 0),
      distM: i * 300,
    }));

  it("groups trips with the same stops into one pattern with median offsets", () => {
    const patterns = new Map<string, PatternAccumulator>();
    addTrip(patterns, trip, stops(36000, [60, 60]));
    addTrip(patterns, trip, stops(36600, [120, 60]));
    addTrip(patterns, trip, stops(37200, [90, 90]));
    const p = [...patterns.values()];
    expect(p).toHaveLength(1);
    expect(medianOffsets(p[0]?.offsets ?? [])).toEqual([0, 90, 180]);
  });

  it("computes the daytime headway and rejects patterns that barely run", () => {
    expect(daytimeHeadwaySec([36000, 37200, 38400, 80000])).toBe(12000);
    expect(daytimeHeadwaySec([3600, 36000])).toBeNull();
  });
});
