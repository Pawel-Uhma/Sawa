import type { Interest } from "@sawa/shared";
import type { Place } from "../domain/place";
import type { StoryBand } from "../domain/story";

/** Polish names of the categories, as the user saw them in onboarding. */
const INTEREST_PL: Record<Interest, string> = {
  historical: "historia",
  cultural: "kultura",
  sports: "sport",
  nature: "przyroda",
};

/** Sawa's persona and the rules for a story told from a tram window (T-41). */
export const STORY_SYSTEM_PROMPT = `Jesteś Sawą. Mieszkasz w Warszawie od roku, jesteś w wieku słuchacza i jedziesz z nim tramwajem albo autobusem. Opowiadasz mu o miejscu, które właśnie mijacie, tak jak koleżanka, która sama niedawno odkryła to miasto: ciepło, na „ty”, z ciekawością, bez patosu i bez tonu przewodnika z wycieczki.

Zasady:
- Mówisz WYŁĄCZNIE to, co jest w podanych faktach. Nie dodajesz dat, liczb, nazwisk ani wydarzeń spoza nich. Jeśli faktów jest mało, opowieść jest krótsza.
- Nie mówisz, po której stronie jest miejsce, bo tego nie wiesz. Możesz powiedzieć „zaraz mijamy”, „tu, przy trasie”.
- Zaczynasz od czegoś, co zaciekawia, a nie od definicji. Jedna myśl prowadzi do następnej.
- Jeśli słuchacz ma zainteresowania, wybierasz fakty, które do nich pasują.
- Tekst będzie czytany na głos: pełne zdania, bez list, nawiasów, skrótów, emoji, linków i formatowania. Lata zapisujesz cyframi.
- Nie wspominasz o źródłach w tekście.

Odpowiadasz samym JSON-em: {"text": "…", "sourceIds": ["s1", …]}, gdzie sourceIds to identyfikatory źródeł, z których wziąłeś fakty.`;

/** The user turn: the place's facts with source ids, never `unverifiedFacts`. */
export function storyUserPrompt(place: Place, interests: readonly Interest[], band: StoryBand) {
  const lines = [
    `Miejsce: ${place.name}`,
    place.addressToday && `Adres dziś: ${place.addressToday}`,
    place.addressHistoric && `Dawny adres: ${place.addressHistoric}`,
    place.period && `Okres: ${place.period}`,
    place.stillExists === false && "Tego miejsca już nie ma w dawnej postaci.",
    place.formerNames.length &&
      `Dawne nazwy: ${place.formerNames.map((n) => [n.name, n.from, n.to].filter(Boolean).join(" ")).join("; ")}`,
    "",
    "Fakty:",
    ...place.facts.map((f) => `- ${f}`),
    place.trivia.length && "Ciekawostki:",
    ...place.trivia.map((t) => `- ${t}`),
    place.people.length && "Ludzie:",
    ...place.people.map((p) => `- ${p.name}: ${p.role}`),
    "",
    "Źródła:",
    ...place.sources.map((s) => `- ${s.id}: ${s.title}`),
    "",
    interests.length
      ? `Zainteresowania słuchacza: ${interests.map((i) => INTEREST_PL[i]).join(", ")}.`
      : "Słuchacz nie podał zainteresowań.",
    `Długość: około ${band.words} słów, nie więcej.`,
  ];
  return lines.filter((l) => l !== false && l !== null && l !== 0).join("\n");
}
