import { describe, expect, it } from "vitest";
import { assignInterests } from "./interests";
import { type HistoriaFeature, mapPhotos, mapPlace } from "./map-place";

const NOW = new Date("2026-10-17T11:00:00Z");

function feature(properties: Partial<HistoriaFeature["properties"]>): HistoriaFeature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [20.9802, 52.237] },
    properties: {
      id: "kercelak",
      nazwa: "Kercelak",
      typ: "miejsce",
      fakty: [],
      zrodla: [],
      ...properties,
    },
  };
}

describe("mapPlace", () => {
  it("maps Polish keys, geometry and source ids", () => {
    const row = mapPlace(
      feature({
        fakty: ["Bazar działał od 1867 r.", "Handel trwał do 1944 r."],
        ciekawostki: ["Tata Tasiemka"],
        zrodla: [
          { tytul: "Wikipedia: Kercelak", url: "https://pl.wikipedia.org/wiki/Kercelak" },
          { tytul: "OSM", url: "https://www.openstreetmap.org/node/1" },
        ],
        pewnosc: "wysoka",
        dzis: [
          {
            nazwa: "Rondo",
            typ: null,
            google_maps: "https://maps.google.com/?cid=1",
            place_id: "ChIJ1",
          },
        ],
        lokalizacja: "przyblizona",
      }),
      NOW,
    );
    expect(row).toMatchObject({
      id: "kercelak",
      kind: "site",
      geom: "SRID=4326;POINT(20.9802 52.237)",
      richness: 3,
      confidence: "high",
      location_precision: "approx",
      origin: "curated",
      today_nearby: [
        {
          name: "Rondo",
          type: null,
          googleMapsUrl: "https://maps.google.com/?cid=1",
          placeId: "ChIJ1",
        },
      ],
      sources: [
        { id: "s1", title: "Wikipedia: Kercelak" },
        { id: "s2", title: "OSM" },
      ],
    });
    expect(row.interests).toEqual(expect.arrayContaining(["war_uprising", "everyday_life"]));
  });

  it("merges both kinds of former names and maps people", () => {
    const row = mapPlace(
      feature({
        typ: "ulica",
        dawne_nazwy: ["Leszno (do 1948)"],
        nazwy_historyczne: [{ nazwa: "Litzmannstadtstrasse", od: "1940", do: "1945" }],
        ludzie: [{ kto: "Karol Świerczewski", rola: "patron alei" }],
      }),
      NOW,
    );
    expect(row.former_names).toEqual([
      { name: "Leszno (do 1948)" },
      { name: "Litzmannstadtstrasse", from: "1940", to: "1945" },
    ]);
    expect(row.people).toEqual([{ name: "Karol Świerczewski", role: "patron alei" }]);
    expect(row.interests).toContain("people");
  });

  it("rejects an unknown typ", () => {
    expect(() => mapPlace(feature({ typ: "zamek" }), NOW)).toThrow(/zamek/);
  });
});

describe("mapPhotos", () => {
  it("prefers the file url, keeps the page url and drops duplicates", () => {
    const photos = mapPhotos(
      feature({
        zdjecia: [
          { url_pliku: "https://upload/a.jpg", url: "https://commons/File:a", licencja: "PD" },
          { url_pliku: "https://upload/a.jpg" },
          { url: "https://commons/File:b", zrodla: "Wikimedia Commons" },
        ],
      }),
    );
    expect(photos).toEqual([
      expect.objectContaining({
        url: "https://upload/a.jpg",
        page_url: "https://commons/File:a",
        license: "PD",
      }),
      expect.objectContaining({
        url: "https://commons/File:b",
        page_url: "https://commons/File:b",
        source: "Wikimedia Commons",
      }),
    ]);
  });
});

describe("assignInterests", () => {
  it("tags by kind even without keywords", () => {
    expect(assignInterests({ kind: "mural", text: "Wolska", hasPeople: false })).toEqual([
      "street_art",
    ]);
  });
});
