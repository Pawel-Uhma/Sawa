import { describe, expect, it } from "vitest";
import { createWawDepartureSource, parseDepartureTimes, warsawTimeToDate } from "./departures";

const row = (time: string) => [
  { key: "brygada", value: "012" },
  { key: "kierunek", value: "Żerań FSO" },
  { key: "czas", value: time },
];

describe("parseDepartureTimes", () => {
  it("reads times from bare rows and from { values } rows", () => {
    expect(parseDepartureTimes({ result: [row("06:46:00"), { values: row("07:01:00") }] })).toEqual(
      ["06:46:00", "07:01:00"],
    );
  });

  it("returns nothing for the portal's error shape", () => {
    expect(parseDepartureTimes({ result: "false", error: "Nieautoryzowany dostęp" })).toEqual([]);
  });
});

describe("warsawTimeToDate", () => {
  it("uses the Warsaw calendar day and summer offset", () => {
    const d = warsawTimeToDate("14:05:00", new Date("2026-10-17T10:00:00Z"));
    expect(d.toISOString()).toBe("2026-10-17T12:05:00.000Z");
  });

  it("rolls times after midnight into the next day", () => {
    const d = warsawTimeToDate("24:30:00", new Date("2026-10-17T10:00:00Z"));
    expect(d.toISOString()).toBe("2026-10-17T22:30:00.000Z");
  });
});

describe("createWawDepartureSource", () => {
  it("returns undefined without a token, without calling the API", async () => {
    const source = createWawDepartureSource(undefined);
    expect(await source.nextDeparture("100101", "10", new Date())).toBeUndefined();
  });
});
