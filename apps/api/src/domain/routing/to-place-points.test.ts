import { describe, expect, it } from "vitest";
import type { PlaceSummary } from "../place";
import { isWorthAStop, toPlacePoints } from "./to-place-points";

describe("toPlacePoints", () => {
  it("maps tags to broad interests and richness to a weight, keeps the kind", () => {
    expect(
      toPlacePoints([
        {
          id: "kercelak",
          name: "Kercelak",
          kind: "site",
          interests: ["everyday_life", "war_uprising"],
          position: { lat: 52.237, lng: 20.9802 },
          richness: 3,
        },
      ]),
    ).toEqual([
      {
        id: "kercelak",
        name: "Kercelak",
        kind: "site",
        position: { lat: 52.237, lng: 20.9802 },
        interests: ["historical", "cultural"],
        weight: 3,
        richness: 3,
      },
    ]);
  });
});

describe("isWorthAStop", () => {
  const place = (name: string, subkind: PlaceSummary["subkind"], richness = 3): PlaceSummary => ({
    id: name,
    name,
    kind: "building",
    subkind,
    interests: [],
    position: { lat: 52.23, lng: 21 },
    richness,
  });

  it.each([
    place("Szkoła Podstawowa nr 12", "school"),
    place("Biblioteka Publiczna, filia 3", "library"),
    place("Boisko Orlik", "pitch"),
    place("Przedszkole nr 5", "building"),
    place("Plac zabaw w parku", "park"),
    place("Pływalnia OSiR Wola", "stadium"),
    place("Kapliczka", "chapel", 0),
  ])("skips everyday places and places with nothing to tell: $name", (p) => {
    expect(isWorthAStop(p)).toBe(false);
  });

  it.each([
    place("Kercelak", "site"),
    place("Stadion Dziesięciolecia", "stadium"),
    place("Politechnika Warszawska", "university"),
    place("Szkoła Główna Handlowa", "university"),
    place("Kapliczka przy Ogrodowej", "chapel", 2),
  ])("keeps places with a story: $name", (p) => {
    expect(isWorthAStop(p)).toBe(true);
  });

  it("leaves dull places out of the planner", () => {
    expect(
      toPlacePoints([place("Przedszkole nr 5", "building"), place("Kercelak", "site")]),
    ).toHaveLength(1);
  });
});
