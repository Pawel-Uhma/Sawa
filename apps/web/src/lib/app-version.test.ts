import { describe, expect, it } from "vitest";
import { calver } from "./app-version";

describe("calver", () => {
  it("gives the commit's date and time in Warsaw, summer time", () => {
    // 07:03 UTC is 09:03 in Warsaw in October (CEST)
    expect(calver(new Date("2026-10-20T07:03:39Z"))).toBe("2026.10.20-0903");
  });

  it("uses winter time and the Warsaw day across midnight UTC", () => {
    // 23:30 UTC on 30 Dec is 00:30 on 31 Dec in Warsaw (CET)
    expect(calver(new Date("2026-12-30T23:30:00Z"))).toBe("2026.12.31-0030");
  });
});
