import { describe, expect, it } from "vitest";
import type { OsmElement } from "./map-osm";
import {
  classifyHistoria,
  leadSentences,
  mapHistoriaElement,
  nameFromTitle,
  pickPerArticle,
  wikiTitle,
  wikiTitleFromUrl,
} from "./map-osm-historia";
import { FeatureSchema, mapPlace } from "./map-place";

function element(tags: Record<string, string>, extra: Partial<OsmElement> = {}): OsmElement {
  return { type: "way", id: 1, center: { lat: 52.24, lon: 21.01 }, tags, ...extra };
}

describe("classifyHistoria", () => {
  it.each([
    [{ historic: "monument" }, "pomnik", ["historical"]],
    [{ historic: "memorial", memorial: "statue" }, "pomnik", ["historical"]],
    [{ historic: "memorial", memorial: "plaque" }, "tablica", ["historical"]],
    [{ amenity: "place_of_worship", historic: "church" }, "swiatynia", ["historical", "religion"]],
    [{ building: "cathedral" }, "swiatynia", ["religion"]],
    [{ landuse: "cemetery" }, "cmentarz", ["historical"]],
    [{ tourism: "museum", historic: "castle" }, "budynek", ["historical", "cultural"]],
    [{ amenity: "theatre" }, "budynek", ["cultural"]],
    [{ historic: "yes", building: "apartments" }, "budynek", ["historical"]],
    [{ tourism: "attraction", building: "yes" }, "budynek", ["historical"]],
    [{ tourism: "artwork", artwork_type: "mural" }, "mural", ["cultural", "street_art"]],
    [{ historic: "yes" }, "miejsce", ["historical"]],
  ])("%o → %s %o", (tags, typ, tagi) => {
    expect(classifyHistoria(element(tags))).toMatchObject({ typ, tagi });
  });

  it("skips parks and sports grounds, which fetch:osm owns", () => {
    expect(classifyHistoria(element({ leisure: "park", historic: "yes" }))).toBeNull();
  });
});

describe("wiki titles", () => {
  it("reads the OSM tag, skipping other languages and section links", () => {
    expect(wikiTitle("pl:Kolumna_Zygmunta III Wazy")).toBe("Kolumna Zygmunta III Wazy");
    expect(wikiTitle("en:Sigismund's Column")).toBeNull();
    expect(wikiTitle("pl:Ulica Agrykola#Historia")).toBeNull();
  });

  it("decodes curated Wikipedia URLs to the same form", () => {
    expect(wikiTitleFromUrl("https://pl.wikipedia.org/wiki/Rze%C5%BA_Woli")).toBe("Rzeź Woli");
    expect(wikiTitleFromUrl("https://pl.wikipedia.org/wiki/Spark_(biurowiec)#Historia")).toBe(
      "Spark (biurowiec)",
    );
    expect(wikiTitleFromUrl("https://example.com/wiki/Rzeź_Woli")).toBeNull();
  });

  it("names an unnamed element after its article", () => {
    expect(nameFromTitle("Kamienica Rosenblata w Warszawie")).toBe("Kamienica Rosenblata");
    expect(nameFromTitle("Biblioteka Narodowa (Warszawa)")).toBe("Biblioteka Narodowa");
  });
});

describe("leadSentences", () => {
  it("splits sentences, keeping abbreviations and initials inside", () => {
    const lead =
      "Kościół św. Augustyna – kościół przy ul. Nowolipki 18 w Warszawie, zbudowany w latach 1891–1896. " +
      "Zaprojektował go J. P. Dziekoński, m.in. autor katedry. Krótko.\n" +
      "W 1944 r. Niemcy urządzili w nim magazyn i punkt obserwacyjny. Kościół przetrwał wojnę jako jeden z nielicznych przy ul.";
    expect(leadSentences(lead)).toEqual([
      "Kościół św. Augustyna – kościół przy ul. Nowolipki 18 w Warszawie, zbudowany w latach 1891–1896.",
      "Zaprojektował go J. P. Dziekoński, m.in. autor katedry.",
      "W 1944 r. Niemcy urządzili w nim magazyn i punkt obserwacyjny.",
    ]);
  });

  it("skips section headings and caps the count", () => {
    const text = `== Historia ==\n${"Zdanie dłuższe niż trzydzieści znaków, numer x. ".repeat(10)}`;
    expect(leadSentences(text, 3)).toHaveLength(3);
  });
});

describe("pickPerArticle", () => {
  it("keeps one element per article, the building outline first", () => {
    const items = [
      { el: element({ historic: "memorial" }, { type: "node", id: 1 }), title: "A" },
      { el: element({ building: "church" }, { id: 2 }), title: "A" },
      { el: element({ historic: "yes" }, { id: 3 }), title: "B" },
    ];
    expect(pickPerArticle(items).map((x) => x.el.id)).toEqual([2, 3]);
  });
});

describe("mapHistoriaElement", () => {
  it("builds a feature the seed accepts, with sources and tags", () => {
    const el = element(
      {
        historic: "monument",
        name: "Kolumna Zygmunta III Wazy",
        "addr:street": "plac Zamkowy",
        heritage: "2",
      },
      { type: "node", id: 7, lat: 52.2473, lon: 21.0136, center: undefined },
    );
    const cls = classifyHistoria(el);
    if (!cls) throw new Error("expected a class");
    const feature = mapHistoriaElement(el, cls, {
      title: "Kolumna Zygmunta III Wazy",
      extract:
        "Kolumna Zygmunta III Wazy – pomnik króla Zygmunta III Wazy na placu Zamkowym w Warszawie. Wzniesiona w latach 1643–1644.",
      url: "https://pl.wikipedia.org/wiki/Kolumna_Zygmunta_III_Wazy",
    });
    expect(feature?.properties.fakty.at(-1)).toBe(
      "W OpenStreetMap oznaczone jako pomnik; w rejestrze zabytków.",
    );
    const row = mapPlace(FeatureSchema.parse(feature), new Date("2026-10-17T12:00:00Z"));
    expect(row).toMatchObject({
      id: "osm-node-7",
      kind: "monument",
      geom: "SRID=4326;POINT(21.0136 52.2473)",
      address_today: "plac Zamkowy",
      origin: "osm",
      confidence: "high",
      location_precision: "exact",
    });
    expect(row.interests).toContain("historical");
    expect(row.sources.map((s) => s.url)).toEqual([
      "https://pl.wikipedia.org/wiki/Kolumna_Zygmunta_III_Wazy",
      "https://www.openstreetmap.org/node/7",
    ]);
  });
});
