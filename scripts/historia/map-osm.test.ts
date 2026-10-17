import { describe, expect, it } from "vitest";
import {
  bboxAreaM2,
  dedupeByName,
  isOuterLandmark,
  MIN_GREEN_M2,
  mapOsmElement,
  type OsmElement,
  osmPosition,
  osmTag,
  wikiLeadsFromQuery,
  wikiTitle,
} from "./map-osm";
import { FeatureSchema, mapPlace } from "./map-place";

// About 220 × 140 m around (52.24, 20.97).
const BOUNDS = { minlat: 52.2394, minlon: 20.969, maxlat: 52.2406, maxlon: 20.971 };

function element(tags: Record<string, string>, extra: Partial<OsmElement> = {}): OsmElement {
  return { type: "way", id: 1, center: { lat: 52.24, lon: 20.97 }, bounds: BOUNDS, tags, ...extra };
}

describe("osmTag", () => {
  it.each([
    [{ leisure: "park", name: "Park Moczydło" }, "nature"],
    [{ leisure: "garden", name: "Ogród Centralny" }, "nature"],
    [{ leisure: "stadium", name: "Stadion Syrenki" }, "sport"],
    [{ leisure: "sports_centre", name: "OSiR Ochota" }, "sport"],
    [{ leisure: "sports_centre", name: "Polna", sport: "swimming" }, "sport"],
  ])("keeps %o as %s", (tags, tag) => {
    expect(osmTag(element(tags))).toBe(tag);
  });

  it.each([
    ["a billiards club", { leisure: "sports_centre", name: "147 Break", sport: "billiards" }],
    ["a generic pitch", { leisure: "pitch", name: "Boisko A" }],
    ["an unnamed park", { leisure: "park" }],
    ["a numbered court", { leisure: "pitch", name: "Kort 12", sport: "tennis" }],
    ["a bare Orlik", { leisure: "pitch", name: "Orlik", sport: "soccer" }],
    ["a community garden", { leisure: "garden", name: "Ogród Społecznościowy „Odnowa”" }],
    ["a picnic lawn", { leisure: "park", name: "Polana Grillowa" }],
  ])("skips %s", (_, tags) => {
    expect(osmTag(element(tags))).toBeNull();
  });

  it("skips a small square without Wikipedia, keeps it with Wikipedia", () => {
    const small = { minlat: 52.24, minlon: 20.97, maxlat: 52.2402, maxlon: 20.9703 };
    const tags = { leisure: "park", name: "Skwer Psa Fafika" };
    expect(osmTag(element(tags, { bounds: small }))).toBeNull();
    expect(osmTag(element({ ...tags, wikipedia: "pl:Skwer" }, { bounds: small }))).toBe("nature");
  });

  it("skips a park mapped as a node unless it links Wikipedia", () => {
    const node = { type: "node" as const, lat: 52.24, lon: 20.97, center: undefined };
    const { bounds: _, ...rest } = element({ leisure: "park", name: "Sakura Park" }, node);
    expect(osmTag(rest)).toBeNull();
    expect(osmTag({ ...rest, tags: { ...rest.tags, wikipedia: "pl:Sakura" } })).toBe("nature");
  });
});

describe("isOuterLandmark", () => {
  // About 1 km × 1 km: a large park.
  const LARGE = { minlat: 52.1, minlon: 21.2, maxlat: 52.109, maxlon: 21.2147 };

  it("keeps places with Wikipedia, large parks, stadiums and sports centres", () => {
    expect(isOuterLandmark(element({ leisure: "pitch", wikipedia: "pl:Boisko" }), "sport")).toBe(
      true,
    );
    expect(isOuterLandmark(element({ leisure: "park" }, { bounds: LARGE }), "nature")).toBe(true);
    expect(isOuterLandmark(element({ leisure: "stadium" }), "sport")).toBe(true);
    expect(isOuterLandmark(element({ leisure: "sports_centre" }), "sport")).toBe(true);
  });

  it("drops small parks and pitches", () => {
    expect(isOuterLandmark(element({ leisure: "park" }), "nature")).toBe(false);
    expect(isOuterLandmark(element({ leisure: "pitch" }), "sport")).toBe(false);
  });
});

describe("bboxAreaM2 and osmPosition", () => {
  it("measures the bounding box in square metres", () => {
    expect(bboxAreaM2(element({}))).toBeGreaterThan(MIN_GREEN_M2);
    expect(bboxAreaM2(element({}))).toBeCloseTo(133.6 * 136.4, -2);
    expect(bboxAreaM2(element({}, { bounds: undefined }))).toBe(0);
  });

  it("takes the middle of the bounds when Overpass gives no centre", () => {
    expect(osmPosition(element({}, { center: undefined }))).toEqual({
      lat: expect.closeTo(52.24, 6),
      lng: expect.closeTo(20.97, 6),
    });
    expect(osmPosition(element({}, { center: undefined, bounds: undefined }))).toBeNull();
  });
});

describe("mapOsmElement", () => {
  it("builds a feature the seed accepts, with sources and tags", () => {
    const feature = mapOsmElement(
      element({ leisure: "park", name: "Park Mirowski" }, { id: 42 }),
      "nature",
      {
        title: "Park Mirowski w Warszawie",
        extract: "Park Mirowski – park w Warszawie.",
        url: "https://pl.wikipedia.org/wiki/Park_Mirowski_w_Warszawie",
      },
    );
    const row = mapPlace(FeatureSchema.parse(feature), new Date("2026-10-17T12:00:00Z"));
    expect(row).toMatchObject({
      id: "osm-way-42",
      kind: "site",
      geom: "SRID=4326;POINT(20.97 52.24)",
      origin: "osm",
      confidence: "high",
      location_precision: "approx",
      richness: 2,
    });
    expect(row.interests).toContain("nature");
    expect(row.sources.map((s) => s.url)).toEqual([
      "https://pl.wikipedia.org/wiki/Park_Mirowski_w_Warszawie",
      "https://www.openstreetmap.org/way/42",
    ]);
  });

  it("lists sports in Polish", () => {
    const feature = mapOsmElement(
      element({ leisure: "sports_centre", name: "OSiR", sport: "swimming;soccer" }),
      "sport",
    );
    expect(feature?.properties.fakty.at(-1)).toContain("pływanie, piłka nożna");
  });
});

describe("dedupeByName", () => {
  it("drops the same name nearby, keeps it far away", () => {
    const kept = dedupeByName([
      { name: "Stadion Syrenki", lat: 52.24, lng: 20.97 },
      { name: "stadion  syrenki", lat: 52.2405, lng: 20.97 },
      { name: "Stadion Syrenki", lat: 52.3, lng: 20.97 },
    ]);
    expect(kept).toHaveLength(2);
  });
});

describe("wikiTitle and wikiLeadsFromQuery", () => {
  it("reads Polish titles only", () => {
    expect(wikiTitle("pl:Park Mirowski w Warszawie")).toBe("Park Mirowski w Warszawie");
    expect(wikiTitle("en:Saxon Garden")).toBeNull();
    expect(wikiTitle(undefined)).toBeNull();
  });

  it("follows normalisation and redirects, keeps the first paragraph", () => {
    const leads = wikiLeadsFromQuery({
      query: {
        normalized: [{ from: "Pole_Mokotowskie", to: "Pole Mokotowskie" }],
        redirects: [{ from: "Park Fosa", to: "Park Fosa w Warszawie" }],
        pages: [
          {
            title: "Pole Mokotowskie",
            extract: "Pole Mokotowskie – park.\nDrugi akapit.",
            fullurl: "https://pl.wikipedia.org/wiki/Pole_Mokotowskie",
          },
          { title: "Park Fosa w Warszawie", extract: "Park Fosa – park w Warszawie." },
          { title: "Nie ma", missing: true },
        ],
      },
    });
    expect(leads.get("Pole_Mokotowskie")).toEqual({
      title: "Pole Mokotowskie",
      extract: "Pole Mokotowskie – park.",
      url: "https://pl.wikipedia.org/wiki/Pole_Mokotowskie",
    });
    expect(leads.get("Park Fosa")?.title).toBe("Park Fosa w Warszawie");
    expect(leads.has("Nie ma")).toBe(false);
  });
});
