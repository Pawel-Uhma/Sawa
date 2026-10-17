import type { Familiarity } from "@sawa/shared";
import type { Place } from "./place";

/**
 * Background a first-timer needs before a place makes sense ("what was the Uprising?").
 * Sawa explains each one once; the client remembers it in `knownContexts`.
 * Only well-established facts, since the story may say nothing beyond what it is given.
 * `title` is how Sawa refers to it once explained ("słyszał już o: …").
 */
export type StoryContext = { id: string; tag: string; title: string; text: string };

export const STORY_CONTEXTS: readonly StoryContext[] = [
  {
    id: "powstanie-1944",
    tag: "war_uprising",
    title: "Powstanie Warszawskie",
    text: "Powstanie Warszawskie wybuchło 1 sierpnia 1944 roku. Armia Krajowa walczyła z Niemcami przez 63 dni, do 2 października. Zginęło kilkanaście tysięcy powstańców i około 150 tysięcy cywilów, a po kapitulacji Niemcy wysiedlili mieszkańców i burzyli miasto.",
  },
  {
    id: "getto-warszawskie",
    tag: "jewish_warsaw",
    title: "getto warszawskie",
    text: "Przed wojną prawie co trzeci mieszkaniec Warszawy był Żydem. W listopadzie 1940 roku Niemcy zamknęli warszawskich Żydów w getcie otoczonym murem, gdzie stłoczono ponad 400 tysięcy ludzi. Latem 1942 roku większość wywieziono do obozu zagłady w Treblince, a w kwietniu 1943 roku w getcie wybuchło powstanie.",
  },
  {
    id: "warszawa-przemyslowa",
    tag: "industry",
    title: "przemysłowa Warszawa",
    text: "W XIX wieku Warszawa stała się dużym miastem przemysłowym. Fabryki wyrastały zwłaszcza na Woli i na Pradze, a obok nich robotnicze kamienice.",
  },
];

/** Background of this place the listener already heard, to keep Sawa from repeating it. */
export function knownContextsOf(
  place: Pick<Place, "interests">,
  known: readonly string[],
): StoryContext[] {
  return STORY_CONTEXTS.filter((c) => place.interests.includes(c.tag) && known.includes(c.id));
}

/**
 * The background to explain with this place: only for first-timers, at most one per story,
 * never one the listener already heard.
 */
export function contextFor(
  place: Pick<Place, "interests">,
  familiarity: Familiarity | undefined,
  known: readonly string[],
): StoryContext | null {
  if (familiarity !== "first_time") return null;
  return (
    STORY_CONTEXTS.find((c) => place.interests.includes(c.tag) && !known.includes(c.id)) ?? null
  );
}
