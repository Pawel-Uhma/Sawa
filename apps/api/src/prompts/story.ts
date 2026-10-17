import type { Familiarity, Interest, StoryStyle } from "@sawa/shared";
import type { StoryContext } from "../domain/contexts";
import type { Place } from "../domain/place";
import type { FactPick } from "../domain/story";

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
- Mówisz WYŁĄCZNIE to, co jest w podanych faktach i w podanym tle. Nie dodajesz dat, liczb, nazwisk ani wydarzeń spoza nich. Jeśli faktów jest mało, opowieść jest krótsza.
- Nie mówisz, po której stronie jest miejsce, bo tego nie wiesz. Możesz powiedzieć „zaraz mijamy”, „tu, przy trasie”.
- Zaczynasz od czegoś, co zaciekawia, a nie od definicji. Jedna myśl prowadzi do następnej.
- Opowiadasz o faktach z części „Do opowiedzenia”. Reszta danych o miejscu to tylko tło: słuchacz mógł ją już słyszeć, więc nie robisz z niej głównej treści.
- Jeśli słuchacz ma zainteresowania, akcentujesz to, co do nich pasuje.
- Trzymasz się podanego stylu i długości.
- Tekst będzie czytany na głos: pełne zdania, bez list, nawiasów, skrótów, emoji, linków i formatowania. Lata zapisujesz cyframi.
- Nie wspominasz o źródłach w tekście.

Odpowiadasz samym JSON-em: {"text": "…", "sourceIds": ["s1", …]}, gdzie sourceIds to identyfikatory źródeł, z których wziąłeś fakty.`;

/** How Sawa talks in each onboarding style (lib/onboarding.ts in apps/web). */
const STYLE_PL: Record<StoryStyle, string> = {
  fun: "krótko, lekko i z humorem, jak znajoma z miasta",
  deep: "z detalami: daty, ludzie i tło wydarzeń, spokojnie i bez pośpiechu",
  trivia: "jedna ciekawostka w jednym, dwóch zdaniach, bez wstępu",
};

export type StoryPromptOpts = {
  pick: FactPick;
  words: number;
  style?: StoryStyle;
  familiarity?: Familiarity;
  /** Background to explain first (first-timers, once per topic). */
  context: StoryContext | null;
  /** Background of this place the listener already heard. */
  knownContexts: readonly StoryContext[];
};

/** The user turn: the place's data with source ids and the facts to tell, never `unverifiedFacts`. */
export function storyUserPrompt(
  place: Place,
  interests: readonly Interest[],
  opts: StoryPromptOpts,
) {
  const { pick, context } = opts;
  const lines = [
    `Miejsce: ${place.name}`,
    place.addressToday && `Adres dziś: ${place.addressToday}`,
    place.addressHistoric && `Dawny adres: ${place.addressHistoric}`,
    place.period && `Okres: ${place.period}`,
    place.stillExists === false && "Tego miejsca już nie ma w dawnej postaci.",
    place.formerNames.length &&
      `Dawne nazwy: ${place.formerNames.map((n) => [n.name, n.from, n.to].filter(Boolean).join(" ")).join("; ")}`,
    place.people.length && "Ludzie:",
    ...place.people.map((p) => `- ${p.name}: ${p.role}`),
    "",
    pick.facts.length ? "Do opowiedzenia:" : "Do opowiedzenia: tylko nazwa i to, co wyżej.",
    ...pick.facts.map((f) => `- ${f.text}`),
    "",
    "Źródła:",
    ...place.sources.map((s) => `- ${s.id}: ${s.title}`),
    "",
    context &&
      `Słuchacz jest w Warszawie pierwszy raz. Zanim powiesz o miejscu, wyjaśnij jednym, dwoma zdaniami tło: ${context.text}`,
    !context &&
      opts.familiarity === "first_time" &&
      "Słuchacz jest w Warszawie pierwszy raz: mów prosto i nie zakładaj, że zna miasto.",
    opts.familiarity &&
      opts.familiarity !== "first_time" &&
      "Słuchacz zna Warszawę: nie tłumacz ogólnej historii miasta, mów o tym miejscu.",
    opts.knownContexts.length &&
      `Słuchacz słyszał już ode mnie o: ${opts.knownContexts.map((c) => c.title).join(", ")}. Nie tłumacz tego od nowa.`,
    pick.recap &&
      "Słuchacz był już tutaj i słyszał wszystkie te fakty. Przypomnij krótko jeden, zaczynając od „Pamiętasz…”.",
    interests.length
      ? `Zainteresowania słuchacza: ${interests.map((i) => INTEREST_PL[i]).join(", ")}.`
      : "Słuchacz nie podał zainteresowań.",
    opts.style && `Styl: ${STYLE_PL[opts.style]}.`,
    `Długość: około ${opts.words} słów, nie więcej.`,
  ];
  return lines.filter((l) => l !== false && l !== null && l !== 0 && l !== undefined).join("\n");
}
