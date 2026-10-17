import { describe, expect, it } from "vitest";
import { dedupeByName, mapOsmElement, type OsmElement, osmTag } from "./map-osm";
import { FeatureSchema, mapPlace } from "./map-place";

function element(tags: Record<string, string>, extra: Partial<OsmElement> = {}): OsmElement {
  return { type: "way", id: 1, center: { lat: 52.24, lon: 20.97 }, tags, ...extra };
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
  ])("skips %s", (_, tags) => {
    expect(osmTag(element(tags))).toBeNull();
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
