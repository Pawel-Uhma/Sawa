// Dane placeholder do demo. Bez API i bez bazy. Teksty opowieści generuje później LLM z faktów (T-42),
// więc tu nie ma żadnych tekstów Sawy.

export const DURATION_MIN_MIN = 30;
export const DURATION_MAX_MIN = 240;
export const DURATION_STEP_MIN = 15;

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
  // Pozycja na szkicowej mapie, w jednostkach viewBox 0..1000.
  x: number;
  y: number;
};

export const MOCK_PLACES: MockPlace[] = [
  { id: "p-1", name: "Miejsce testowe A", interest: "everyday_life", line: "22", x: 420, y: 380 },
  { id: "p-2", name: "Miejsce testowe B", interest: "war_uprising", line: "10", x: 560, y: 300 },
  { id: "p-3", name: "Miejsce testowe C", interest: "architecture", line: "18", x: 610, y: 470 },
  { id: "p-4", name: "Miejsce testowe D", interest: "street_art", line: "4", x: 470, y: 560 },
  { id: "p-5", name: "Miejsce testowe E", interest: "jewish_warsaw", line: "35", x: 300, y: 500 },
  { id: "p-6", name: "Miejsce testowe F", interest: "industry", line: "13", x: 700, y: 620 },
  { id: "p-7", name: "Miejsce testowe G", interest: "people", line: "17", x: 350, y: 260 },
  { id: "p-8", name: "Miejsce testowe H", interest: "religion", line: "5", x: 520, y: 700 },
];

export type MockStop = MockPlace & {
  // Minuty od startu trasy do tego punktu.
  etaMin: number;
};

// Placeholder planera: liczba punktów rośnie z czasem, kolejność to po prostu kolejność listy.
export function buildMockRoute(durationMin: number, interests: string[]): MockStop[] {
  const pool = interests.length
    ? [...MOCK_PLACES].sort((a, b) => Number(interests.includes(b.interest)) - Number(interests.includes(a.interest)))
    : MOCK_PLACES;
  const count = Math.min(pool.length, Math.max(3, Math.round(durationMin / 25)));
  const step = durationMin / count;

  return pool.slice(0, count).map((place, index) => ({
    ...place,
    etaMin: Math.round(step * (index + 1)),
  }));
}

export const PLACEHOLDER_WEATHER = { tempC: 12, place: "Wola" } as const;
