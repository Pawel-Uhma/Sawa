import { describe, expect, it } from "vitest";
import { appendReports } from "./history";
import type { VehicleHistory, VehicleReport } from "./types";

const report = (id: string, atMs: number, line = "9"): VehicleReport => ({
  id,
  line,
  mode: "tram",
  brigade: "1",
  position: { lat: 52.23, lng: 21 },
  reportedAtMs: atMs,
});

describe("appendReports", () => {
  it("appends new reports and skips repeated ones", () => {
    const store = new Map<string, VehicleHistory>();
    appendReports(store, [report("a", 1_000)], 1_000, 60_000);
    appendReports(store, [report("a", 1_000), report("a", 11_000)], 11_000, 60_000);
    expect(store.get("a")?.samples.map((s) => s.atMs)).toEqual([1_000, 11_000]);
  });

  it("drops samples older than keepMs and forgets silent vehicles", () => {
    const store = new Map<string, VehicleHistory>();
    appendReports(store, [report("a", 0), report("b", 0)], 0, 60_000);
    appendReports(store, [report("a", 50_000)], 50_000, 60_000);
    appendReports(store, [], 70_000, 60_000);
    expect(store.get("a")?.samples.map((s) => s.atMs)).toEqual([50_000]);
    expect(store.has("b")).toBe(false);
  });

  it("ignores reports already too old (last position of a vehicle out of service)", () => {
    const store = new Map<string, VehicleHistory>();
    appendReports(store, [report("a", 0)], 3_600_000, 60_000);
    expect(store.size).toBe(0);
  });

  it("starts a new history when the vehicle switches lines", () => {
    const store = new Map<string, VehicleHistory>();
    appendReports(store, [report("a", 0)], 0, 60_000);
    appendReports(store, [report("a", 10_000, "10")], 10_000, 60_000);
    expect(store.get("a")?.line).toBe("10");
    expect(store.get("a")?.samples).toHaveLength(1);
  });
});
