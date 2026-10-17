import type { PlaceKind } from "@sawa/shared";
import type { Place } from "../domain/place";

/** How the search names each kind, so a mural called "David Bowie" is not the singer's biography. */
const KIND_PL: Record<PlaceKind, string> = {
  building: "budynek",
  monument: "pomnik",
  plaque: "tablica pamiątkowa",
  street: "ulica",
  site: "miejsce",
  mural: "mural",
  event: "wydarzenie",
  church: "kościół",
  cemetery: "cmentarz",
};

/** Facts already in the seed that go into the query to point the search at the right place. */
const HINT_FACTS = 2;

/** What the model does with the pages the web search found (T-41: stories, not an encyclopedia). */
export const RESEARCH_SYSTEM_PROMPT = `Zbierasz materiał do krótkiego odcinka podcastu o miejscu w Warszawie, które słuchacz mija w tramwaju. W podcaście liczą się historie i ciekawostki, nie encyklopedia.

Z wyników wyszukiwania wybierz:
- historie: konkretne zdarzenia, anegdoty, losy ludzi, legendy, spory, to, jak coś powstało i dlaczego;
- ciekawostki: zaskakujące szczegóły, związki ze sławnymi osobami, rzeczy, o których mało kto wie.
Jeśli miejsce jest poświęcone osobie albo wydarzeniu (mural, pomnik, tablica, ulica jej imienia), weź też to, co łączy tę osobę lub wydarzenie z Warszawą i z tym miejscem.

Pomijasz suche dane: wymiary, numery uchwał, daty remontów, nagrody, godziny otwarcia, ceny. Pomijasz inne miejsca o tej samej nazwie i ogólne biografie bez związku z Warszawą.

Każda pozycja to jedno do trzech zdań po polsku, konkretnie: kto, co, kiedy i dlaczego to ciekawe. Piszesz tylko to, co stoi na stronie, z której ją bierzesz. Jeśli strona mówi „podobno”, „według legendy” albo że fani się spierają, zachowujesz tę ostrożność. Najciekawsze dajesz pierwsze, najwyżej 6 pozycji. Jeśli nic ciekawego nie ma, zwracasz pustą listę.

Odpowiadasz samym JSON-em: {"findings": [{"text": "…", "url": "adres strony, z której to wziąłeś"}]}`;

/** The user turn is also the search query: the place, where it is, and what is known. */
export function researchQuery(place: Place): string {
  const where = [place.addressToday, "Warszawa"].filter(Boolean).join(", ");
  const hints = place.facts.slice(0, HINT_FACTS).join(" ");
  return [
    `${place.name} (${KIND_PL[place.kind]}), ${where}: historia, anegdoty i ciekawostki.`,
    hints && `Wiadomo: ${hints}`,
  ]
    .filter(Boolean)
    .join("\n");
}
