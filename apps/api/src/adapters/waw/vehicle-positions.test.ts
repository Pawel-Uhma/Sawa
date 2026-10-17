import { describe, expect, it } from "vitest";
import bus from "./__fixtures__/vehicles-bus.json";
import tram from "./__fixtures__/vehicles-tram.json";
import { parseVehiclePositions, warsawDateTimeToMs } from "./vehicle-positions";

describe("parseVehiclePositions", () => {
  it("maps the live API's bare array to reports", () => {
    const reports = parseVehiclePositions(bus, "bus");
    expect(reports).toHaveLength(6);
    expect(reports[0]).toEqual({
      id: "bus-5855",
      line: "136",
      mode: "bus",
      brigade: "9",
      position: { lat: 52.189083333333336, lng: 20.989496666666668 },
      reportedAtMs: Date.parse("2026-10-17T14:10:03Z"),
    });
  });

  it("reads the documented { result } shape and prefixes tram ids", () => {
    const reports = parseVehiclePositions({ result: tram }, "tram");
    expect(reports.map((r) => r.id)).toEqual(["tram-1296", "tram-1302", "tram-1312"]);
  });

  it("skips malformed rows instead of dropping the response", () => {
    const reports = parseVehiclePositions([{ Lines: "9" }, ...tram.slice(0, 1)], "tram");
    expect(reports).toHaveLength(1);
  });

  it("returns nothing for the portal's error shape", () => {
    expect(
      parseVehiclePositions({ result: "false", error: "Nieautoryzowany dostęp" }, "bus"),
    ).toEqual([]);
  });
});

describe("warsawDateTimeToMs", () => {
  it("uses the Warsaw offset of that date", () => {
    expect(warsawDateTimeToMs("2026-12-01 08:00:00")).toBe(Date.parse("2026-12-01T07:00:00Z"));
    expect(warsawDateTimeToMs("2026-10-17 16:09:38")).toBe(Date.parse("2026-10-17T14:09:38Z"));
  });

  it("returns NaN for a malformed value", () => {
    expect(warsawDateTimeToMs("yesterday")).toBeNaN();
  });
});
