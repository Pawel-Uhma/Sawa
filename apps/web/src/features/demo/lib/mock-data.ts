// Dane placeholder do demo. Bez API i bez bazy. Teksty opowieści generuje później LLM z faktów (T-42),
// więc tu nie ma żadnych tekstów Sawy. Miejsca i współrzędne pochodzą z docs/historia/sawa-historia.geojson,
// trasa to przybliżenie po ulicach (OSRM) z makiet w docs/ui/propozycje/html, a nie prawdziwa linia ZTM.

export type LngLat = [number, number];

export const DURATION_MIN_MIN = 30;
export const DURATION_MAX_MIN = 240;
export const DURATION_STEP_MIN = 15;

/** al. „Solidarności” 171, 42 Warsaw. Stała lokalizacja demo. */
export const USER_LOCATION: LngLat = [20.979, 52.2359];

export type Interest = {
  key: string;
  label: string;
};

// Lista ok. 8 zainteresowań z docs/13-plan-bazy.md §5 (do potwierdzenia przez R3 i R2).
export const INTERESTS: Interest[] = [
  { key: "war_uprising", label: "Wojna i Powstanie" },
  { key: "architecture", label: "Architektura" },
  { key: "industry", label: "Przemysł i technika" },
  { key: "religion", label: "Religie" },
  { key: "jewish_warsaw", label: "Żydowska Warszawa" },
  { key: "everyday_life", label: "Codzienne życie" },
  { key: "street_art", label: "Street art" },
  { key: "people", label: "Znane postaci" },
];

// Po wyborze jednego zainteresowania pokazujemy „podobne” (PRD, punkt 2 onboardingu).
// Mapowanie placeholder, do zastąpienia przez prawdziwe podobieństwo.
export const SIMILAR_INTERESTS: Record<string, string[]> = {
  war_uprising: ["jewish_warsaw", "people"],
  architecture: ["industry", "street_art"],
  industry: ["architecture", "everyday_life"],
  religion: ["jewish_warsaw", "architecture"],
  jewish_warsaw: ["war_uprising", "religion"],
  everyday_life: ["street_art", "people"],
  street_art: ["everyday_life", "architecture"],
  people: ["war_uprising", "everyday_life"],
};

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
};

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

export const PLACEHOLDER_WEATHER = { tempC: 12, place: "Wola" } as const;
