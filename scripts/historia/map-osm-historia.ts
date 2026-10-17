// OSM monuments, churches, museums and theatres with a Polish Wikipedia article (Overpass
// `out center tags`) → features in the docs/historia format (T-73). Pure functions, no IO.

import type { Interest, PlaceTag } from "@sawa/shared";
import type { OsmElement } from "./map-osm";

export type HistoriaTyp =
  | "budynek"
  | "pomnik"
  | "tablica"
  | "swiatynia"
  | "cmentarz"
  | "mural"
  | "miejsce";
type StoredTag = PlaceTag | Interest;

/** What the element is, the tags it brings, and how the OSM line of `fakty` describes it. */
export type Classified = { typ: HistoriaTyp; tagi: StoredTag[]; label: string };

/** Lead of a Polish Wikipedia article, fetched by the caller (after redirects). */
export type WikiArticle = {
  title: string;
  extract: string;
  url: string;
  coordinates?: { lat: number; lng: number };
};

const CULTURE: Record<string, string> = {
  museum: "muzeum",
  gallery: "galeria",
  theatre: "teatr",
  arts_centre: "centrum kultury",
  cinema: "kino",
  library: "biblioteka",
  concert_hall: "sala koncertowa",
};
const HISTORIC_BUILDING: Record<string, string> = {
  building: "zabytkowy budynek",
  castle: "zamek lub pałac",
  palace: "pałac",
  manor: "dwór",
  fort: "fort",
  ruins: "ruiny",
  city_gate: "brama miejska",
  tower: "wieża",
  house: "zabytkowy dom",
  apartments: "zabytkowa kamienica",
  market: "dawny targ",
};
const CHURCH_BUILDINGS = ["church", "cathedral", "chapel", "synagogue", "mosque", "temple"];
const SCULPTURE = ["statue", "sculpture", "bust", "stone", "relief"];

/** Type and explicit tags for an element; null for parks and sports grounds (fetch:osm owns those). */
export function classifyHistoria({ tags }: OsmElement): Classified | null {
  if (tags.leisure) return null;
  const historic = tags.historic ?? "";
  const tourism = tags.tourism ?? "";
  const amenity = tags.amenity ?? "";
  const building = tags.building ?? "";
  const artwork = tags.artwork_type ?? "";

  const tagi: StoredTag[] = [];
  if (historic) tagi.push("historical");
  if (CULTURE[tourism] || CULTURE[amenity] || tourism === "artwork") tagi.push("cultural");
  const with_ = (typ: HistoriaTyp, label: string, ...extra: StoredTag[]): Classified => ({
    typ,
    tagi: [...new Set([...tagi, ...extra])],
    label,
  });

  if (tourism === "artwork" && artwork === "mural") return with_("mural", "mural", "street_art");
  if (historic === "plaque" || (historic === "memorial" && tags.memorial === "plaque"))
    return with_("tablica", "tablica pamiątkowa", "historical");
  if (
    amenity === "place_of_worship" ||
    CHURCH_BUILDINGS.includes(building) ||
    ["church", "chapel", "wayside_shrine"].includes(historic)
  )
    return with_("swiatynia", "świątynia", "religion");
  if (
    tags.landuse === "cemetery" ||
    amenity === "grave_yard" ||
    historic === "cemetery" ||
    tags.landuse === "grave_yard"
  )
    return with_("cmentarz", "cmentarz", "historical");
  if (historic === "memorial" || historic === "monument" || historic === "tomb")
    return with_("pomnik", historic === "memorial" ? "miejsce pamięci" : "pomnik");
  if (tourism === "artwork" && SCULPTURE.includes(artwork)) return with_("pomnik", "rzeźba");
  const culture = CULTURE[tourism] ?? CULTURE[amenity];
  if (culture) return with_("budynek", culture);
  const historicBuilding = HISTORIC_BUILDING[historic];
  if (historicBuilding) return with_("budynek", historicBuilding, "historical");
  if ((historic || tourism === "attraction") && building)
    return with_("budynek", "zabytkowy budynek", "historical");
  return with_("miejsce", historic ? "miejsce historyczne" : "atrakcja turystyczna");
}

/** `pl:Kolumna Zygmunta III Wazy` → title; null for other languages and links to a section. */
export function wikiTitle(tag: string | undefined): string | null {
  const title = tag?.match(/^pl:(.+)$/)?.[1]?.trim();
  return title && !title.includes("#") ? normalizeTitle(title) : null;
}

/** `https://pl.wikipedia.org/wiki/Rze%C5%BA_Woli` → `Rzeź Woli`, comparable with `wikiTitle`. */
export function wikiTitleFromUrl(url: string): string | null {
  const path = url.match(/^https?:\/\/pl\.(?:m\.)?wikipedia\.org\/wiki\/([^#?]+)/)?.[1];
  if (!path) return null;
  try {
    return normalizeTitle(decodeURIComponent(path));
  } catch {
    return normalizeTitle(path);
  }
}

const normalizeTitle = (title: string) => {
  const t = title.replaceAll("_", " ").replace(/\s+/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** Shown when OSM has no name: the article title without the city suffix or qualifier. */
export function nameFromTitle(title: string): string {
  return title.replace(/\s*\([^)]*\)$/, "").replace(/ w Warszawie$/, "");
}

// Words that end in a dot without ending the sentence: "ul. Wolska", "św. Jana", "m.in.".
const ABBREVIATION =
  /(?:^|[^\p{L}])(?:ul|al|pl|im|św|tzw|ok|gen|ks|prof|dr|płk|ppłk|kpt|mjr|por|ppor|abp|bp|kard|np|tj|wg|ang|łac|niem|pw|wezw|ur|zm|in|st|nr|bł|ss|oo|o|hr|inż|arch|ob|red|dyr|marsz|\p{Lu})\.$/u;

/** The lead split into sentences, without short fragments, at most `max`. */
export function leadSentences(extract: string, max = 8): string[] {
  const sentences: string[] = [];
  for (const paragraph of extract.split(/\n+/)) {
    if (paragraph.startsWith("=")) continue; // section heading
    const pieces = paragraph.trim().split(/(?<=[.!?…])\s+/);
    let current = "";
    for (const piece of pieces) {
      // "W 1944 r." is too short to be a sentence of its own.
      const joins =
        ABBREVIATION.test(current) || current.length < 20 || /^[\p{Ll}(\d]/u.test(piece);
      if (current && joins) current = `${current} ${piece}`;
      else {
        if (current) sentences.push(current);
        current = piece;
      }
    }
    // A sentence cut after "ul." comes from a truncated extract.
    if (current && !ABBREVIATION.test(current)) sentences.push(current);
  }
  return sentences.filter((s) => s.length >= 30).slice(0, max);
}

/** Several OSM elements linking one article: keep one, a building outline first, then a node. */
export function pickPerArticle<T extends { el: OsmElement; title: string }>(items: T[]): T[] {
  const rank = ({ el }: T) => (el.tags.building ? 0 : el.type === "node" ? 1 : 2);
  const best = new Map<string, T>();
  for (const item of items) {
    const kept = best.get(item.title);
    if (!kept || rank(item) < rank(kept)) best.set(item.title, item);
  }
  return items.filter((item) => best.get(item.title) === item);
}

export function mapHistoriaElement(el: OsmElement, cls: Classified, wiki: WikiArticle) {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat === undefined || lng === undefined) return null;

  const osmUrl = `https://www.openstreetmap.org/${el.type}/${el.id}`;
  const extras = [
    el.tags.heritage || el.tags["ref:zabytek"] ? "w rejestrze zabytków" : "",
    el.tags.start_date ? `data powstania: ${el.tags.start_date}` : "",
  ].filter(Boolean);

  return {
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [lng, lat] as [number, number] },
    properties: {
      id: `osm-${el.type}-${el.id}`,
      nazwa: el.tags.name ?? nameFromTitle(wiki.title),
      typ: cls.typ,
      adres_dzis: el.tags["addr:street"]
        ? `${el.tags["addr:street"]} ${el.tags["addr:housenumber"] ?? ""}`.trim()
        : null,
      // Areas are represented by their centre.
      lokalizacja: el.type === "node" ? "dokladna" : "przyblizona",
      fakty: [
        ...leadSentences(wiki.extract),
        `W OpenStreetMap oznaczone jako ${cls.label}${extras.length ? `; ${extras.join(", ")}` : ""}.`,
      ],
      zrodla: [
        { tytul: `Wikipedia: ${wiki.title}`, url: wiki.url },
        { tytul: "OpenStreetMap (ODbL)", url: osmUrl },
      ],
      pewnosc: "wysoka",
      zrodlo_rekordu: "osm",
      tagi: cls.tagi,
    },
  };
}

/** Rough distance in metres, enough to tell a nearby article from one about something else. */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = (a.lat - b.lat) * 111_320;
  const dLng = (a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}
