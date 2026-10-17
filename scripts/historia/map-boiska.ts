// City dataset "Otwarte boiska" (dane.um.warszawa.pl, get_be_otwarte_boiska, CC BY) → features in the
// docs/historia format. One API row is one facility type at a school; one place is one school.
// The dataset has addresses only, so the caller geocodes them. Pure functions, no IO.

import { z } from "zod";

const DAYS = [
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
  "Niedziela",
] as const;
const DAY_SHORT = ["pon.", "wt.", "śr.", "czw.", "pt.", "sob.", "niedz."];

export const BoiskoRowSchema = z.looseObject({
  Dzielnica: z.string(),
  "Adres obiektu": z.string(),
  "Nazwa placówki oświatowej": z.string(),
  "Typ obiektu": z.string(),
  Uwagi: z.string().nullish(),
  "Data aktualizacji": z.string().nullish(),
  ...Object.fromEntries(DAYS.map((d) => [d, z.string().nullish()])),
});
export type BoiskoRow = z.infer<typeof BoiskoRowSchema>;

export type School = {
  address: string;
  school: string;
  district: string;
  facilities: string[];
  hours: (string | null)[]; // Monday..Sunday, as given by the first row
  notes: string[];
  updated: string | null;
};

// The portal renders dataset pages client-side; the Sport category lists "Otwarte boiska".
export const DATASET_URL = "https://dane.um.warszawa.pl/catalogue?category=Sport";

export function groupBySchool(rows: BoiskoRow[]): School[] {
  const schools = new Map<string, School>();
  for (const row of rows) {
    const key = `${row["Adres obiektu"]}|${row["Nazwa placówki oświatowej"]}`;
    let school = schools.get(key);
    if (!school) {
      school = {
        address: row["Adres obiektu"].trim(),
        school: row["Nazwa placówki oświatowej"].trim(),
        district: row.Dzielnica,
        facilities: [],
        hours: DAYS.map((d) => (row[d] as string | null | undefined) ?? null),
        notes: [],
        updated: row["Data aktualizacji"] ?? null,
      };
      schools.set(key, school);
    }
    const facility = row["Typ obiektu"].trim();
    if (facility && !/^inne/i.test(facility) && !school.facilities.includes(facility)) {
      school.facilities.push(facility);
    }
    const note = row.Uwagi?.trim();
    if (note && !school.notes.includes(note)) school.notes.push(note);
  }
  return [...schools.values()];
}

/** "Od 17:00 do 22:00" for Mon–Fri and "Od 10:00 do 22:00" at weekends → "pon.–pt. 17:00–22:00, …". */
export function formatHours(hours: (string | null)[]): string | null {
  const clean = hours.map((h) => {
    const m = h?.match(/(\d{1,2}:\d{2}).*?(\d{1,2}:\d{2})/);
    return m ? `${m[1]}–${m[2]}` : (h?.trim() ?? "");
  });
  const parts: string[] = [];
  let start = 0;
  for (let i = 1; i <= clean.length; i++) {
    if (i < clean.length && clean[i] === clean[start]) continue;
    if (clean[start]) {
      const days = i - 1 === start ? DAY_SHORT[start] : `${DAY_SHORT[start]}–${DAY_SHORT[i - 1]}`;
      parts.push(`${days} ${clean[start]}`);
    }
    start = i;
  }
  return parts.length ? parts.join(", ") : null;
}

/** "ul. Elbląska 51" → "Elbląska 51, Warszawa": Nominatim misses the "ul." prefix. */
export function geocodeQuery(address: string): string {
  return `${address.replace(/^(ul|al|pl|os)\.\s*/i, "")}, Warszawa`;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function mapSchool(school: School, position: { lat: number; lng: number }) {
  const hours = formatHours(school.hours);
  const fakty = [
    `Teren sportowy szkoły (${school.school}) jest bezpłatnie otwarty dla mieszkańców: ${school.facilities.join(", ")}.`,
    ...(hours ? [`Godziny otwarcia według miasta: ${hours}.`] : []),
    ...school.notes.map((n) => `Uwagi szkoły: ${n}`),
  ];
  return {
    type: "Feature" as const,
    geometry: {
      type: "Point" as const,
      coordinates: [position.lng, position.lat] as [number, number],
    },
    properties: {
      id: `um-boiska-${slug(school.address)}`,
      nazwa: `Otwarte boiska, ${school.address}`,
      typ: "miejsce",
      adres_dzis: `${school.address}, ${school.district}`,
      lokalizacja: "przyblizona", // geocoded address
      fakty,
      zrodla: [
        {
          tytul: `Miasto Stołeczne Warszawa, „Otwarte boiska” (CC BY)${school.updated ? `, aktualizacja ${school.updated}` : ""}`,
          url: DATASET_URL,
        },
      ],
      pewnosc: "wysoka",
      zrodlo_rekordu: "um-otwarte-boiska",
      tagi: ["sport" as const],
    },
  };
}
