import { describe, expect, it } from "vitest";
import { type BoiskoRow, formatHours, geocodeQuery, groupBySchool, mapSchool } from "./map-boiska";
import { FeatureSchema, mapPlace } from "./map-place";

const WEEK = {
  Poniedziałek: "Od 17:00 do 22:00",
  Wtorek: "Od 17:00 do 22:00",
  Środa: "Od 17:00 do 22:00",
  Czwartek: "Od 17:00 do 22:00",
  Piątek: "Od 17:00 do 22:00",
  Sobota: "Od 10:00 do 22:00",
  Niedziela: "Od 10:00 do 22:00",
};

function row(overrides: Partial<BoiskoRow>): BoiskoRow {
  return {
    Dzielnica: "Wola",
    "Adres obiektu": "ul. Jana Brożka 15",
    "Nazwa placówki oświatowej": "Szkoła Podstawowa nr 225",
    "Typ obiektu": "boiska do koszykówki",
    Uwagi: null,
    "Data aktualizacji": "2026-10-05",
    ...WEEK,
    ...overrides,
  };
}

describe("groupBySchool", () => {
  it("merges facility rows of one school, skips INNE and repeated notes", () => {
    const [school, ...rest] = groupBySchool([
      row({ Uwagi: "Wejście od ulicy" }),
      row({ "Typ obiektu": "bieżnie proste", Uwagi: "Wejście od ulicy" }),
      row({ "Typ obiektu": "INNE niż wymienione" }),
    ]);
    expect(rest).toHaveLength(0);
    expect(school?.facilities).toEqual(["boiska do koszykówki", "bieżnie proste"]);
    expect(school?.notes).toEqual(["Wejście od ulicy"]);
  });
});

describe("formatHours", () => {
  it("groups days with the same hours", () => {
    expect(formatHours(Object.values(WEEK))).toBe("pon.–pt. 17:00–22:00, sob.–niedz. 10:00–22:00");
  });

  it("skips closed days and keeps text it cannot parse", () => {
    expect(formatHours(["Od 8:00 do 20:00", null, null, null, null, "nieczynne", null])).toBe(
      "pon. 8:00–20:00, sob. nieczynne",
    );
  });
});

describe("geocodeQuery", () => {
  it("drops the street prefix and adds the city", () => {
    expect(geocodeQuery("ul. Elbląska 51")).toBe("Elbląska 51, Warszawa");
    expect(geocodeQuery("al. Jana Pawła II 26")).toBe("Jana Pawła II 26, Warszawa");
  });
});

describe("mapSchool", () => {
  it("builds a sport feature the seed accepts, citing the city dataset", () => {
    const [school] = groupBySchool([row({})]);
    if (!school) throw new Error("no school");
    const feature = mapSchool(school, { lat: 52.24, lng: 20.97 });
    const place = mapPlace(FeatureSchema.parse(feature), new Date("2026-10-17T12:00:00Z"));
    expect(place).toMatchObject({
      id: "um-boiska-ul-jana-brozka-15",
      name: "Otwarte boiska, ul. Jana Brożka 15",
      origin: "um-otwarte-boiska",
      address_today: "ul. Jana Brożka 15, Wola",
    });
    expect(place.interests).toContain("sport");
    expect(place.facts[1]).toContain("pon.–pt. 17:00–22:00");
    expect(place.sources[0]?.title).toContain("Otwarte boiska");
  });
});
