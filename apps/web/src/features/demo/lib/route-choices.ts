import { MAX_EXCLUDED_PLACES, type Route } from "@sawa/shared";
import { useCallback, useRef, useState } from "react";
import { warmStories } from "./api-data";

/**
 * Trasy do wyboru z jednej odpowiedzi planera (#197): sama trasa i jej `alternatives`, każda
 * bez własnych alternatyw, żeby wybrana nie niosła reszty listy.
 */
export function routeChoices(route: Route): Route[] {
  const { alternatives = [], ...main } = route;
  return [main, ...alternatives.filter((alt) => alt.id !== main.id)];
}

/**
 * Miejsca pokazanych już tras dla „Losuj inną” (`excludePlaceIds`): nowe na końcu, bez
 * powtórzeń, najwyżej tyle, ile przyjmie API (najstarsze odpadają).
 */
export function seenPlaceIds(seen: readonly string[], routes: readonly Route[]): string[] {
  const ids = [...seen, ...routes.flatMap((r) => r.places.map((p) => p.placeId))];
  const unique = [...new Set(ids.reverse())].reverse();
  return unique.slice(-MAX_EXCLUDED_PLACES);
}

/** Losowy `seed` dla planera; ten sam seed daje te same trasy. */
export function randomSeed(random: () => number = Math.random): number {
  return Math.floor(random() * 2_147_483_647);
}

export type Shuffle = { seed: number; excludePlaceIds: string[] };

/**
 * Stan wyboru trasy: propozycje z ostatniego planu, „Losuj inną” (pomija miejsca wszystkich
 * pokazanych dotąd tras) i rozgrzewanie opowieści tylko tej trasy, którą ktoś wybrał.
 * `offer` i `shuffle` zwracają trasę do pokazania (pierwszą z propozycji).
 */
export function useRouteChoices() {
  const [choices, setChoices] = useState<Route[]>([]);
  const [shuffling, setShuffling] = useState(false);
  const [shuffleFailed, setShuffleFailed] = useState(false);
  const seen = useRef<string[]>([]);
  // planRoute rozgrzewa już pierwszą trasę odpowiedzi
  const warmed = useRef(new Set<string>());

  const accept = useCallback((route: Route, seenBefore: readonly string[]): Route => {
    const next = routeChoices(route);
    setChoices(next);
    setShuffleFailed(false);
    seen.current = seenPlaceIds(seenBefore, next);
    const first = next[0] as Route;
    warmed.current.add(first.id);
    return first;
  }, []);

  /** Nowy plan (Generuj, podgląd): lista od nowa. */
  const offer = useCallback((route: Route) => accept(route, []), [accept]);

  /** Wybrana karta: jej opowieści szukamy dopiero teraz. */
  const choose = useCallback((route: Route) => {
    if (warmed.current.has(route.id)) return;
    warmed.current.add(route.id);
    warmStories(route);
  }, []);

  const shuffle = useCallback(
    async (plan: (shuffle: Shuffle) => Promise<Route>): Promise<Route | null> => {
      setShuffling(true);
      setShuffleFailed(false);
      try {
        const before = seen.current;
        return accept(await plan({ seed: randomSeed(), excludePlaceIds: before }), before);
      } catch {
        setShuffleFailed(true);
        return null;
      } finally {
        setShuffling(false);
      }
    },
    [accept],
  );

  return { choices, shuffling, shuffleFailed, offer, choose, shuffle };
}
