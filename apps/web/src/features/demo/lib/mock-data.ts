// Dane placeholder do demo. Bez API i bez bazy. Teksty opowieści generuje później LLM z faktów (T-42),
// więc tu nie ma żadnych tekstów Sawy. Miejsca i współrzędne pochodzą z docs/historia/sawa-historia.geojson,
// trasa to przybliżenie po ulicach (OSRM) z makiet w docs/ui/propozycje/html, a nie prawdziwa linia ZTM.

import { type Lang, pick } from "@/features/i18n";

export type LngLat = [number, number];

/** Kroki suwaka czasu (min). Do 1 h co 5 min, dalej co 15 min, żeby odstęp 30 min–1 h nie był ściśnięty. */
export const DURATION_STOPS_MIN = [
  5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210,
  225, 240,
];
export const DURATION_MIN_MIN = DURATION_STOPS_MIN[0];
export const DURATION_MAX_MIN = DURATION_STOPS_MIN[DURATION_STOPS_MIN.length - 1];

/** al. „Solidarności” 171, 42 Warsaw. Stała lokalizacja demo. */
export const USER_LOCATION: LngLat = [20.979, 52.2359];

export type MockPlace = {
  id: string;
  name: string;
  interest: string;
  line: string;
  coord: LngLat;
  // Pozycja na trasie, 0..1 od startu.
  along: number;
};

/** Miejsca podpisane na mapie ekranu głównego (jak w makiecie A6). */
export const HOME_PINS: { id: string; name: string; coord: LngLat }[] = [
  { id: "kercelak", name: "Kercelak", coord: [20.98019, 52.23702] },
  { id: "rzez-woli", name: "Rzeź Woli 1944", coord: [20.98352, 52.23869] },
  { id: "helios", name: "Kino „Helios”", coord: [20.97953, 52.23518] },
];

export const ROUTE_PLACES: MockPlace[] = [
  {
    id: "helios",
    name: "Kino „Helios”",
    interest: "everyday_life",
    line: "22",
    coord: [20.97953, 52.23518],
    along: 0.002,
  },
  {
    id: "przytulek",
    name: "Przytułek dla starozakonnych",
    interest: "jewish_warsaw",
    line: "22",
    coord: [20.9767, 52.2357],
    along: 0.033,
  },
  {
    id: "balon",
    name: "Mural „Balon na Woli”",
    interest: "street_art",
    line: "22",
    coord: [20.97682, 52.23617],
    along: 0.034,
  },
  {
    id: "kercelak",
    name: "Kercelak",
    interest: "everyday_life",
    line: "1",
    coord: [20.98019, 52.23702],
    along: 0.066,
  },
  {
    id: "rogatki",
    name: "Rogatki Wolskie",
    interest: "architecture",
    line: "1",
    coord: [20.9806, 52.2356],
    along: 0.082,
  },
  {
    id: "elektrownia",
    name: "Elektrownia Tramwajowa",
    interest: "war_uprising",
    line: "22",
    coord: [20.981, 52.2329],
    along: 0.122,
  },
  {
    id: "daszynskiego",
    name: "Rondo Daszyńskiego",
    interest: "architecture",
    line: "22",
    coord: [20.98444, 52.23033],
    along: 0.291,
  },
  {
    id: "kasprzak",
    name: "Zakłady Radiowe Kasprzaka",
    interest: "industry",
    line: "10",
    coord: [20.97208, 52.22928],
    along: 0.409,
  },
  {
    id: "foton",
    name: "Zakłady „Foton”",
    interest: "industry",
    line: "10",
    coord: [20.96892, 52.23367],
    along: 0.893,
  },
  {
    id: "michler",
    name: "Pałacyk Michlera",
    interest: "architecture",
    line: "10",
    coord: [20.97047, 52.23456],
    along: 0.908,
  },
  {
    id: "katastrofa",
    name: "Katastrofa tramwajowa 1987",
    interest: "everyday_life",
    line: "10",
    coord: [20.97278, 52.23497],
    along: 0.932,
  },
  {
    id: "karmelitanki",
    name: "Klasztor Karmelitanek",
    interest: "religion",
    line: "10",
    coord: [20.97482, 52.23479],
    along: 0.946,
  },
];

export const ROUTE_LINE: LngLat[] = [
  [20.9795, 52.23565],
  [20.97953, 52.2355],
  [20.97672, 52.23535],
  [20.97666, 52.23568],
  [20.97678, 52.23581],
  [20.97875, 52.23631],
  [20.9796, 52.23663],
  [20.97996, 52.23664],
  [20.98018, 52.23653],
  [20.98069, 52.23504],
  [20.98155, 52.23398],
  [20.98227, 52.23257],
  [20.98335, 52.23124],
  [20.98385, 52.23047],
  [20.98246, 52.2301],
  [20.98002, 52.22968],
  [20.97823, 52.22945],
  [20.9783, 52.22921],
  [20.97944, 52.22932],
  [20.98297, 52.22991],
  [20.98444, 52.23003],
  [20.98486, 52.23013],
  [20.98504, 52.2302],
  [20.98465, 52.23064],
  [20.9842, 52.23057],
  [20.98285, 52.23018],
  [20.98002, 52.22968],
  [20.97654, 52.22926],
  [20.96081, 52.22826],
  [20.95737, 52.22818],
  [20.95708, 52.22928],
  [20.95678, 52.23119],
  [20.95605, 52.23319],
  [20.95598, 52.23366],
  [20.956, 52.23613],
  [20.95634, 52.23772],
  [20.95893, 52.23772],
  [20.96197, 52.23745],
  [20.96156, 52.23589],
  [20.96058, 52.23595],
  [20.95963, 52.23583],
  [20.96054, 52.23317],
  [20.96065, 52.23256],
  [20.96077, 52.23243],
  [20.96093, 52.23239],
  [20.96226, 52.23283],
  [20.96314, 52.23303],
  [20.96688, 52.23355],
  [20.97106, 52.23439],
  [20.97636, 52.23572],
  [20.97666, 52.23563],
  [20.97672, 52.23535],
  [20.97953, 52.2355],
  [20.9795, 52.23565],
];

export type MockStop = MockPlace & {
  // Minuty od startu trasy do tego punktu.
  etaMin: number;
  // Z planera: sekundy od startu do punktu i ile Sawa może o nim mówić (`RoutePlace.windowSec`).
  etaSec?: number;
  windowSec?: number;
  // Odcinek, na którym jest punkt; "walk" to spacer (wtedy `line` jest pusty).
  mode?: "tram" | "bus" | "walk";
};

/** Jak podpisać odcinek punktu: numer linii albo „pieszo”. */
export function stopLineLabel(stop: Pick<MockStop, "line" | "mode">, lang: Lang = "pl"): string {
  return stop.mode === "walk" ? pick(lang, "pieszo", "on foot") : stop.line;
}

// Placeholder planera: liczba punktów rośnie z czasem, preferowane są wybrane tematy,
// a kolejność wynika z położenia na trasie.
export function buildMockRoute(durationMin: number, interests: string[]): MockStop[] {
  const count = Math.min(ROUTE_PLACES.length, Math.max(3, Math.round(durationMin / 20)));
  const ranked = [...ROUTE_PLACES].sort(
    (a, b) => Number(interests.includes(b.interest)) - Number(interests.includes(a.interest)),
  );
  const picked = ranked.slice(0, count).sort((a, b) => a.along - b.along);

  let previous = 0;
  return picked.map((place, index) => {
    const spread = ((index + 1) / (picked.length + 1)) * durationMin;
    const etaMin = Math.max(previous + 3, Math.round(spread));
    previous = etaMin;
    return { ...place, etaMin };
  });
}

// Zakładka Przejażdżki (makieta D). Grywalna jest tylko trasa po Woli, bo historia miejsc
// obejmuje 1 km od 42 Warsaw. Pozostałe dwie to zapowiedzi: linie uproszczone z makiet (OSRM), bez punktów.
export type RidePreview = {
  id: string;
  title: string;
  /** Tytuł po angielsku (features/i18n). */
  titleEn: string;
  /** Orientacyjny czas, tylko do opisu na karcie. */
  durationMin: number;
  line: LngLat[];
};

export const UPCOMING_RIDES: RidePreview[] = [
  {
    id: "srodmiescie",
    title: "Śródmieście tramwajem",
    titleEn: "City centre by tram",
    durationMin: 70,
    line: [
      [20.9795, 52.23565],
      [20.97953, 52.2355],
      [20.97672, 52.23535],
      [20.97666, 52.23568],
      [20.97921, 52.23647],
      [20.98538, 52.23909],
      [21.00073, 52.24413],
      [21.00425, 52.24505],
      [21.00502, 52.24545],
      [21.00466, 52.24582],
      [21.00088, 52.24438],
      [21.00397, 52.24177],
      [21.00435, 52.23961],
      [21.00652, 52.23827],
      [21.01084, 52.23114],
      [21.01127, 52.22972],
      [21.01151, 52.22953],
      [21.01226, 52.22969],
      [21.01133, 52.23071],
      [21.00674, 52.2383],
      [21.00394, 52.23743],
      [21.00057, 52.23707],
      [20.99701, 52.23595],
      [20.99766, 52.23432],
      [20.99777, 52.23301],
      [20.99878, 52.23217],
      [20.99991, 52.23048],
      [20.99974, 52.23031],
      [20.99497, 52.22935],
      [20.99521, 52.22907],
      [20.9955, 52.22913],
      [20.99521, 52.22907],
      [20.99509, 52.22928],
      [20.99548, 52.22939],
      [20.99987, 52.23032],
      [21.00061, 52.22932],
      [20.995, 52.22797],
      [20.99251, 52.23203],
      [20.98465, 52.23064],
      [20.98314, 52.23216],
      [20.98079, 52.23564],
      [20.97953, 52.2355],
      [20.9795, 52.23565],
    ],
  },
  {
    id: "praga",
    title: "Praga za oknem",
    titleEn: "Praga out the window",
    durationMin: 85,
    line: [
      [20.9795, 52.23565],
      [20.97953, 52.2355],
      [20.97672, 52.23535],
      [20.97666, 52.23568],
      [20.97921, 52.23647],
      [20.98538, 52.23909],
      [21.00073, 52.24413],
      [21.00425, 52.24505],
      [21.00504, 52.24549],
      [21.00472, 52.2458],
      [21.00439, 52.24578],
      [21.00088, 52.24438],
      [21.00331, 52.24243],
      [21.00542, 52.24296],
      [21.00738, 52.24372],
      [21.00855, 52.24384],
      [21.01086, 52.24494],
      [21.00978, 52.24557],
      [21.00865, 52.24581],
      [21.00879, 52.24625],
      [21.01661, 52.247],
      [21.03506, 52.25471],
      [21.03324, 52.25653],
      [21.035, 52.25819],
      [21.03724, 52.25678],
      [21.03392, 52.25538],
      [21.03741, 52.25201],
      [21.03903, 52.25112],
      [21.03613, 52.24902],
      [21.03589, 52.2489],
      [21.03544, 52.24907],
      [21.03505, 52.24888],
      [21.03571, 52.24868],
      [21.03731, 52.24989],
      [21.03498, 52.25178],
      [21.03158, 52.25033],
      [21.02897, 52.25236],
      [21.01644, 52.24695],
      [21.00477, 52.24586],
      [21.00088, 52.24438],
      [21.00298, 52.2426],
      [21.00368, 52.24245],
      [21.00396, 52.24264],
      [21.0034, 52.2425],
      [21.00103, 52.24442],
      [20.98459, 52.239],
      [20.98056, 52.23835],
      [20.97842, 52.23821],
      [20.9801, 52.23682],
      [20.98048, 52.23561],
      [20.97953, 52.2355],
      [20.9795, 52.23565],
    ],
  },
];
