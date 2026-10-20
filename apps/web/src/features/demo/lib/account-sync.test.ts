import type { Route } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import {
  memoryFromVisits,
  mergeMemory,
  missingVisits,
  parseSavedRoutes,
  parseVisits,
  profileFromRow,
  profileToRow,
  type SavedRouteRequest,
  savedRouteInsert,
  visitInsert,
} from "./account-sync";
import type { Memory } from "./memory";

const visit = (placeId: string, facts: string[], heardAt: string, contexts: string[] = []) => ({
  place_id: placeId,
  place_name: placeId.toUpperCase(),
  fact_ids: facts,
  context_ids: contexts,
  heard_at: heardAt,
});

describe("memoryFromVisits", () => {
  it("folds all visits of a place into one entry with the latest time", () => {
    const memory = memoryFromVisits(
      [
        visit("kercelak", ["a", "b"], "2026-10-18T10:00:00Z", ["powstanie"]),
        visit("kercelak", ["b", "c"], "2026-10-19T10:00:00Z"),
      ],
      ["getto"],
    );
    expect(memory.places.kercelak).toEqual({
      name: "KERCELAK",
      facts: ["a", "b", "c"],
      at: Date.parse("2026-10-19T10:00:00Z"),
    });
    expect(memory.contexts.sort()).toEqual(["getto", "powstanie"]);
  });
});

describe("mergeMemory", () => {
  it("keeps places and facts from both sides", () => {
    const a: Memory = { places: { x: { name: "X", facts: ["1"], at: 1 } }, contexts: ["c1"] };
    const b: Memory = {
      places: { x: { facts: ["2"], at: 5 }, y: { name: "Y", facts: [], at: 2 } },
      contexts: ["c1", "c2"],
    };
    expect(mergeMemory(a, b)).toEqual({
      places: { x: { name: "X", facts: ["1", "2"], at: 5 }, y: { name: "Y", facts: [], at: 2 } },
      contexts: ["c1", "c2"],
    });
  });
});

describe("missingVisits", () => {
  const local: Memory = {
    places: {
      x: { name: "X", facts: ["1", "2"], at: Date.parse("2026-10-18T10:00:00Z") },
      y: { name: "Y", facts: [], at: Date.parse("2026-10-18T11:00:00Z") },
    },
    contexts: [],
  };

  it("uploads the whole device memory on the first sign-in", () => {
    const rows = missingVisits(local, { places: {}, contexts: [] });
    expect(rows.map((row) => [row.place_id, row.fact_ids])).toEqual([
      ["x", ["1", "2"]],
      ["y", []],
    ]);
    expect(rows[0]?.heard_at).toBe("2026-10-18T10:00:00.000Z");
  });

  it("uploads only facts the account does not know yet", () => {
    const remote = memoryFromVisits([
      visit("x", ["1"], "2026-10-18T10:00:00Z"),
      visit("y", [], "2026-10-18T11:00:00Z"),
    ]);
    expect(missingVisits(local, remote).map((row) => [row.place_id, row.fact_ids])).toEqual([
      ["x", ["2"]],
    ]);
  });
});

describe("rows", () => {
  it("skips malformed rows instead of failing the whole list", () => {
    const request: SavedRouteRequest = {
      origin: { lat: 52.24, lng: 20.99 },
      durationMin: 90,
      rideEnd: { type: "loop" },
      travel: "transit",
    };
    const routes = parseSavedRoutes([
      {
        id: "r1",
        title: "loop",
        request,
        place_ids: ["x"],
        place_names: ["X"],
        total_min: 88,
        created_at: "2026-10-19T10:00:00Z",
      },
      { id: "r2", title: "zepsuta", request: { origin: "?" } },
    ]);
    expect(routes).toEqual([
      {
        id: "r1",
        title: "loop",
        request,
        placeNames: ["X"],
        totalMin: 88,
        at: Date.parse("2026-10-19T10:00:00Z"),
      },
    ]);
    expect(parseVisits([{ place_id: 1 }, visit("x", [], "2026-10-19T10:00:00Z")])).toHaveLength(1);
    expect(parseSavedRoutes(null)).toEqual([]);
  });

  it("titles a saved ride by its destination", () => {
    const route = {
      places: [{ placeId: "x", name: "X" }],
      totalMin: 41.6,
    } as unknown as Route;
    const insert = savedRouteInsert(route, {
      origin: { lat: 52.24, lng: 20.99 },
      durationMin: 45,
      rideEnd: { type: "destination", name: "Muzeum", point: { lat: 52.23, lng: 21.0 } },
      travel: "walk",
    });
    expect(insert).toMatchObject({
      title: "Muzeum",
      place_ids: ["x"],
      place_names: ["X"],
      total_min: 42,
    });
  });

  it("round-trips the listener profile and ignores an account without onboarding", () => {
    const profile = {
      familiarity: "local",
      interests: ["historical"],
      storyStyle: "fun",
      audience: null,
    };
    expect(profileFromRow(profileToRow(profile, ["c"]))).toEqual(profile);
    expect(
      profileFromRow({
        familiarity: null,
        interests: [],
        story_style: null,
        audience: null,
        context_ids: [],
      }),
    ).toBeNull();
  });

  it("turns a heard story into a visit", () => {
    expect(
      visitInsert({ placeId: "x", factIds: ["1"], contextIds: ["c"], placeName: "X" }),
    ).toEqual({ place_id: "x", place_name: "X", fact_ids: ["1"], context_ids: ["c"] });
  });
});
