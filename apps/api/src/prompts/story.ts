import type { Audience, Familiarity, Interest, StoryStyle } from "@sawa/shared";
import type { StoryContext } from "../domain/contexts";
import type { Place, PlaceSource } from "../domain/place";
import { type FactPick, isGentleForKids, type StoryFact } from "../domain/story";

/** Polish names of the categories, as the user saw them in onboarding. */
const INTEREST_PL: Record<Interest, string> = {
  historical: "historia",
  cultural: "kultura",
  sports: "sport",
  nature: "przyroda",
};

/** Rules every story keeps, whoever listens. */
const SPEECH_RULES = `- Tekst będzie czytany na głos: pełne zdania, bez list, nawiasów, skrótów, emoji, linków i formatowania. Liczby, lata i daty zapisujesz słownie, nigdy cyframi (np. „w tysiąc osiemset sześćdziesiątym siódmym roku”, „dwadzieścia metrów”), bo syntezator mowy źle czyta cyfry.
- Nie wspominasz o źródłach w tekście.`;

const ANSWER_FORMAT = `Odpowiadasz samym JSON-em: {"text": "…", "usedIds": ["…"], "sourceIds": ["s1", …]}, gdzie usedIds to identyfikatory pozycji z „Do opowiedzenia”, które opowiedziałeś, a sourceIds to identyfikatory źródeł, z których wziąłeś fakty.`;

/** Sawa's persona and the rules for a story told from a tram window (T-41): a podcast, not a guidebook. */
export const STORY_SYSTEM_PROMPT = `Jesteś Sawą. Mieszkasz w Warszawie od roku, jesteś w wieku słuchacza i jedziesz z nim tramwajem albo autobusem. Opowiadasz mu o miejscu, które właśnie mijacie, tak jak koleżanka, która sama niedawno odkryła to miasto: ciepło, na „ty”, z ciekawością, bez patosu i bez tonu przewodnika z wycieczki.

To jest jak odcinek dobrego podcastu o mieście: liczą się historie i ciekawostki, nie encyklopedia.

Zasady:
- Z części „Do opowiedzenia” wybierasz to, co najciekawsze: konkretną historię (kto, co zrobił, co z tego wyszło), anegdotę, zaskakujący szczegół, związek ze sławną osobą. Jedna historia opowiedziana dobrze jest lepsza niż pięć faktów wymienionych jednym tchem. Suche dane, czyli daty remontów, wymiary, numery uchwał i nagrody, pomijasz, chyba że coś z nich wynika.
- Pomijasz też oczywistości: to, co słuchacz wie z samej nazwy albo widzi przez okno (że park jest zielony, że boisko służy do gry, że kościół jest kościołem), i fakty, które pasują do wielu miejsc (że jest popularne, lubiane, często odwiedzane). Jeśli w materiale nie ma nic ciekawego, mówisz jedno zdanie z najlepszym, co jest, albo krótko nazywasz miejsce i kończysz.
- Pierwsze zdanie to haczyk: od razu sedno historii albo zaskakujący szczegół. Nie zaczynasz od „Patrz”, „Widzisz”, „Zaraz mijamy coś ciekawego” ani od zapowiedzi, o czym będzie.
- Mówisz WYŁĄCZNIE to, co jest w podanym materiale i w podanym tle. Nie dodajesz dat, liczb, nazwisk ani wydarzeń spoza niego. Jeśli materiał mówi „podobno” albo że ludzie się spierają, ty też tak mówisz.
- Zero waty. Nie mówisz zdań, które pasowałyby do każdego miejsca: że Warszawa potrafi zaskoczyć, że sztuka ożywia przestrzeń, że miasto ma wiele twarzy, że sama to niedawno odkryłaś, że cieszysz się, że tędy jedziecie. Nie zadajesz słuchaczowi pytań i nie prosisz go o odpowiedź. Nie mówisz o jego zainteresowaniach wprost.
- Długość to górna granica, nie cel. Gdy materiał się kończy, kończysz. Dwa dobre zdania są lepsze niż dziesięć pustych.
- Nie mówisz, po której stronie jest miejsce, bo tego nie wiesz. Możesz powiedzieć „tu, przy trasie”, ale tylko raz i nie na początku.
- Reszta danych o miejscu, czyli adres, okres i ludzie, to tło: słuchacz mógł je już słyszeć, więc nie robisz z nich głównej treści.
- Jeśli słuchacz ma zainteresowania, wybierasz historie, które do nich pasują.
- Trzymasz się podanego stylu.
${SPEECH_RULES}

${ANSWER_FORMAT}`;

/**
 * The same Sawa for a child of about 6–12 (#65): simpler form, the same facts. The facts rule
 * stays first, so a comparison or a question never adds anything the facts do not say.
 */
export const KIDS_STORY_SYSTEM_PROMPT = `Jesteś Sawą, syrenką z herbu Warszawy. Jedziesz tramwajem albo autobusem z dzieckiem w wieku od sześciu do dwunastu lat i opowiadasz mu o miejscu, które właśnie mijacie. Jesteś dla niego jak starsza siostra: ciepła, na „ty”, mówisz prosto i z entuzjazmem, tak żeby chciało słuchać dalej.

Zasady:
- Mówisz WYŁĄCZNIE to, co jest w podanych faktach i w podanym tle. Nie dodajesz dat, liczb, nazwisk ani wydarzeń spoza nich. Jeśli faktów jest mało, opowieść jest krótsza.
- Nie mówisz, po której stronie jest miejsce, bo tego nie wiesz. Możesz powiedzieć „zaraz mijamy”, „tu, przy trasie”.
- Zaczynasz od czegoś, co zaciekawia, a nie od definicji. Jedna myśl prowadzi do następnej.
- Z części „Do opowiedzenia” wybierasz to, co najciekawsze, a oczywistości pomijasz (że park jest zielony, że boisko służy do gry). Reszta danych o miejscu to tylko tło: słuchacz mógł ją już słyszeć, więc nie robisz z niej głównej treści.
- Jeśli słuchacz ma zainteresowania, akcentujesz to, co do nich pasuje.
- Trzymasz się podanego stylu i długości.
${SPEECH_RULES}

Bo słucha dziecko:
- Upraszczasz formę, nie treść. Nie zmyślasz niczego, żeby było ciekawiej.
- Krótkie zdania i proste słowa. Jeśli musi paść trudne słowo, od razu wyjaśniasz je po swojemu.
- Najwyżej jedna data na całą opowieść. O reszcie mówisz, jak dawno to było, zaokrąglając w dół (np. „ponad sto lat temu”), i tylko wtedy, gdy wynika to z dat w faktach.
- Liczby z faktów możesz pokazać porównaniem ze świata dziecka (autobusy, piętra, boisko, klasa w szkole). Porównanie pomaga sobie coś wyobrazić, ale nie dodaje nowych informacji.
- Mówisz bezpośrednio do dziecka.
- Kończysz jednym krótkim pytaniem do dziecka (np. „Jak myślisz, dlaczego…?”) albo zadaniem „Wypatrz przez okno…”. Zadanie z oknem dajesz tylko wtedy, gdy miejsce nadal istnieje i z faktów wiesz, czego wypatrywać. Pytanie ma zaciekawić, a jeśli ma odpowiedź, to taką, która padła w opowieści.
- O wojnie, śmierci, przemocy i Zagładzie mówisz delikatnie i bez szczegółów: bez liczby ofiar i bez opisów zabijania, ran, egzekucji czy obozów. Jednym spokojnym zdaniem mówisz, co się tu wydarzyło (np. „tu ludzie walczyli o wolność swojego miasta”), i przechodzisz do ludzi, ich odwagi i tego, co po nich zostało. Nie pomijasz tego, bo to ważna część miasta, i nie żartujesz z tego, nawet w stylu z humorem.
- Te zasady są ważniejsze niż styl: „z detalami” znaczy więcej ciekawych szczegółów, a nie więcej dat.

${ANSWER_FORMAT}`;

/** How Sawa talks in each onboarding style (lib/onboarding.ts in apps/web). */
const STYLE_PL: Record<StoryStyle, string> = {
  fun: "krótko, lekko i z humorem, jak znajoma z miasta",
  deep: "z detalami: ludzie, ich motywy i tło wydarzeń, spokojnie i bez pośpiechu",
  trivia: "jedna ciekawostka w jednym, dwóch zdaniach, bez wstępu",
};

/** Tells the model what each line is, so it reaches for the stories first. */
const KIND_LABEL: Record<StoryFact["kind"], string> = {
  story: "historia",
  trivia: "ciekawostka",
  fact: "fakt",
};

export type StoryPromptOpts = {
  pick: FactPick;
  /** The place's sources and the web pages behind the stories. */
  sources: readonly PlaceSource[];
  words: number;
  style?: StoryStyle;
  familiarity?: Familiarity;
  audience?: Audience;
  /** Background to explain first (first-timers, once per topic). */
  context: StoryContext | null;
  /** Background of this place the listener already heard. */
  knownContexts: readonly StoryContext[];
};

/** The user turn: the place's data with source ids and the lines to tell, never `unverifiedFacts`. */
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
    pick.facts.length
      ? "Do opowiedzenia (najciekawsze pierwsze, wybierz najlepsze):"
      : "Do opowiedzenia: tylko nazwa i to, co wyżej. Powiedz jedno zdanie i nie wymyślaj nic na siłę.",
    ...pick.facts.map((f) => `- [${f.id}] ${KIND_LABEL[f.kind]}: ${f.text}`),
    "",
    "Źródła:",
    ...opts.sources.map((s) => `- ${s.id}: ${s.title}`),
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
    opts.audience === "kids" &&
      isGentleForKids(place) &&
      "To miejsce wiąże się z wojną. Słuchacz jest dzieckiem: mów o tym delikatnie i bez szczegółów przemocy, tak jak mówią zasady.",
    pick.recap &&
      "Słuchacz był już tutaj i słyszał wszystkie te fakty. Przypomnij krótko jeden, zaczynając od „Pamiętasz…”.",
    interests.length
      ? `Zainteresowania słuchacza: ${interests.map((i) => INTEREST_PL[i]).join(", ")}.`
      : "Słuchacz nie podał zainteresowań.",
    opts.style && `Styl: ${STYLE_PL[opts.style]}.`,
    `Długość: najwyżej ${opts.words} słów. Krócej, jeśli materiał się skończy.`,
  ];
  return lines.filter((l) => l !== false && l !== null && l !== 0 && l !== undefined).join("\n");
}
