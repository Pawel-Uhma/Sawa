# Stan projektu

**Ostatnia aktualizacja:** 17.10.2026, ok. 17:50 (Szczepan, z agentem)

- 16:45 (Paweł, z agentem R3): pojazdy na mapie (T-100, issue #30) w gałęzi `r3/pojazdy-na-zywo`: hook co 10 s, ikony tramwaju i autobusu z `public/icons/`, płynny ruch w `requestAnimationFrame`. Typecheck, lint i testy zielone; zmergowane do `main` (PR, typecheck, lint i testy zielone). Do sprawdzenia na mapie z `WAW_TOKEN`.

## Teraz

- Jasiek (16:30, z agentem, za R1): pojazdy na żywo (T-99, PR #29, dla Pawła issue #30). `POST /v1/vehicles/track` zwraca pojazd użytkownika i po jednym przed i za nim z torem do płynnej animacji; prędkość z tego, jak odcinek przejechał poprzedni pojazd linii (korki). Zbiór miasta „Lokalizacja pojazdów” (T-95). **Dla R3 (Paweł):** ikony i animacja w T-100, instrukcja w [15-pojazdy-na-zywo.md](15-pojazdy-na-zywo.md). **Dla R1:** na Railway `WAW_TOKEN` (T-17), w dniu demo `VEHICLES_ALWAYS_ON=1`.
- 16:33 (Antek, R3): akceptuję zmiany Pawła w `features/map`. Kolory trasy wg linii (`LINE_COLORS`, `lineIndexes`, przesiadki i dojścia) zostają: logika jest w czystych funkcjach z testami, a dla pasażera linia mówi więcej niż typ pojazdu. Eksporty `usePlace`, `useSelectedPlace`, `PLACE_KIND_LABELS`, `placeKindColor` z `index.ts` też zostają. Uwaga: mamy teraz dwie karty miejsca (`PlaceSheet` w mapie i `place-card` w demo); do ustalenia z Pawłem, czy `PlaceSheet` zostaje tylko na `/mapa`.

- 16:40 (Paweł, z agentem R3): **pamięć Sawy i onboarding, który działa.** Zainteresowania to 4 kategorie z danych (historia, kultura, sport, przyroda). Opowieści biorą `familiarity`, `storyStyle`, `heardFacts`, `knownContexts` i mówią to, czego słuchacz jeszcze nie słyszał (pierwszy raz: raz na temat tło, np. Powstanie). Planer dostaje `heard` i omija miejsca opowiedziane do końca (po jednej trasie następna ma 1 wspólne miejsce na 10). Opis: [ui/onboarding.md](ui/onboarding.md), [12-plan-mvp.md](12-plan-mvp.md) §7 pkt 9 i §8. **Dla R1 (Szczepan):** w `score.ts` doszedł `noveltyOf` (mnożnik pamięci), a do `PlacePoint` pole `richness`, do akceptacji. **Dla R2:** sport i przyroda potrzebują 2–3 faktów na miejsce, 64 miejsca nie mają tagu.
- R1 (Szczepan, 17:50): trasy od 5 min i odcinki piesze ([12-plan-mvp.md](12-plan-mvp.md) §7 pkt 10). `MIN_DURATION_MIN` = 5; poniżej 30 min trasa może być samym spacerem. **Dla R3:** `Leg.mode` ma nową wartość `walk` (`line` pusty, proste odcinki); trasy komunikacją zaczynają się od dojścia na przystanek (`legs[0]` może być `walk`), `RoutePlace.legIndex` wskazuje właściwy odcinek. Dodałem minimalnie: kolor `walk` w `map-style.ts` i `route-layer.tsx`, szary znaczek „pieszo” w `rides-panel.tsx`; suwak czasu może zejść do 5 min. **Dla R4:** opowieści mogą dotyczyć też odcinków pieszych (wolniej, miejsca bliżej).
- R1 (Szczepan, 16:30): planer czyta odpowiedzi z onboardingu: `tags` (kafelki), `familiarity`, `storyStyle` w `POST /v1/routes/plan` ([12-plan-mvp.md](12-plan-mvp.md) §7 pkt 8). Odjazdy z prawdziwym tokenem działają (PR #20: API zwraca gołą tablicę). **Dla R3:** w `api-data.ts` `planRoute` przyjmuje trzeci argument z profilem, `demo-app.tsx` go przekazuje (2 linie w Waszych plikach); `rides-panel.tsx` nadal bez profilu. **Dla R4:** `storyStyle` zmienia tylko odstępy (deep = dłuższe `windowSec`), prompt może go też czytać.
- 16:10 (Paweł, z agentem R3): pogoda z górnego paska usunięta. Lewy górny róg: na telefonie głowa Sawy, na desktopie głowa + „sawa.”. Klik otwiera menu (`features/demo/components/sawa-menu.tsx`): arkusz od dołu na telefonie, popover spod logo na desktopie. W menu: zainteresowania, znajomość miasta, styl opowieści (wracają do kroku onboardingu), ostatnia przejażdżka, polecenie Sawy (share/schowek), źródła danych, „Zacznij od nowa”.
- 16:07 (Antek, R3): mapa pobiera miejsca z kafelków widoku (`GET /v1/places?bbox=` na kafelek ok. 2,7 km), więc widać wszystkie ok. 1300 miejsc z bazy, nie tylko ok. 1,7 km wokół 42 Warsaw. Poniżej zoomu 13 miejsc nie ma, jest podpowiedź „Przybliż mapę”. PR #27. Szczegóły: [14-plan-mapy.md](14-plan-mapy.md) §3.
- 16:00 (Paweł, z agentem R3): mapa rysuje każdą linię trasy innym kolorem (`LINE_COLORS` w `map-style.ts`, kolejne odcinki tej samej linii dzielą kolor), start i przesiadki to kółka w kolorze linii z jej numerem, a przejście między przystankami to kropkowana linia. Zamiast koloru wg `mode` (`LEG_MODE_COLORS` usunięte; zaakceptowane przez Antka 16:33). Suwak czasu: podpisy stoją w miejscach swoich wartości.
- 15:54 (Paweł, z agentem R3): karta miejsca: wybrany wariant A (arkusz jak w Mapach Apple), B i C oraz przełącznik usunięte. Kod: `features/demo/components/place-card.tsx` (powłoka i części), `place-details.tsx` (treść), `place-card-host.tsx`.

- 15:47 (Paweł, z agentem R3): karta miejsca na ekranie głównym (klik w pin): 3 propozycje w kodzie do wyboru, przełącznik u góry ekranu ([dziennik UI](ui/README.md)). Po wyborze zostaje jeden wariant, a przełącznik znika. W `features/map/index.ts` dodany eksport `usePlace`, `useSelectedPlace`, `PLACE_KIND_LABELS`, `placeKindColor` (zaakceptowane przez Antka 16:33).

- 15:55 (Paweł, z agentem R3): ekran główny demo ma wybór końca trasy: „Przed siebie”, „Wracam tu” (`returnToStart`) i „Do celu” (`destination`: 4 gotowe cele albo stuknięcie w mapę). Cel to koralowa kropka na mapie, a arkusz trasy mówi, gdy planer nie dojechał (`endsAtDestination`/`endsAtStart` = false). `SawaMap` ma dwa nowe propsy: `destination` i `onMapClick`.
- 15:42 (Paweł, z agentem R3): Sawa działa jako PWA. Na iPhonie w Safari wybierz „Udostępnij” i „Do ekranu początkowego”: aplikacja otwiera się pełnoekranowo z ikoną syrenki. Dodane `app/manifest.ts`, `app/apple-icon.png` i `public/icons/`.
- R2 (Jasiek, 16:10): miejsca na całą Warszawę (T-73). W Supabase i w `places.geojson` jest 1347 miejsc (rano 485): 628 wokół 42 Warsaw, 459 w pasie Śródmieście–Żoliborz–Ochota–Mokotów–Praga, 260 w pozostałych dzielnicach. Źródła: 342 zabytki, kościoły, muzea i teatry z OSM z artykułem w Wikipedii (`fetch:osm-historia`; poza pasem tylko z długim wstępem, tryb `--fast`), parki i sport z OSM (371; poza pasem tylko parki od 5 ha, stadiony i ośrodki), „Otwarte boiska” z 18 dzielnic (308). Pomiar planera przy 1092 miejscach (start 42 Warsaw): najdłuższa luka bez opowieści przy 60 min w jedną stronę 28 → 20 min (ostatnia opowieść w 63., nie 31. minucie), przy 90 min 38 → 16 min, przy 120 min 39 → 22 min.
- 16:10 (Jasiek): produkcja działa na `main` (`/health` 01ed0e3): `/v1/places` widzi bazę (1303 miejsc), opowieści z LLM i głos odpowiadają. Wcześniejsza blokada (Railway stał na 14:00, brak kluczy Supabase) zdjęta. Zadania z przeglądu stanu o 15:00 mają numery T-90–T-98 (T-76 zajął R1); T-90, T-91 i T-96 już zamknięte.
- R1 (Szczepan, 15:00): planer bierze odjazdy z rozkładu ZTM dla każdego odcinka, także przesiadek. **Dla R3:** `Leg.realDeparture: true` = godzina z rozkładu; bez pola godzina jest szacowana (można pokazać „ok. 14:05”). Do sprawdzenia z prawdziwym tokenem (T-17).
- R1 (Szczepan, 14:40): planer przyjmuje punkt końcowy: `destination: {lat, lng}` w `POST /v1/routes/plan` (nie razem z `returnToStart`), odpowiedź ma `endsAtDestination`. **Dla R3:** wybór celu na mapie wysyła `destination`; gdy `endsAtDestination` jest `false`, pokaż, że do celu nie udało się dojechać. Szczegóły: [12-plan-mvp.md](12-plan-mvp.md) §7 pkt 7.

- 14:54 (Paweł, z agentem R3): PR #16 Antka w `main`, ekrany demo (`demo-app.tsx`) używają już jego `SawaMap` z `@/features/map`; stara mapa `features/demo/components/sawa-map.tsx` usunięta. Wbudowana karta miejsca jest w demo wyłączona (`hasPlaceSheet={false}`), bo wjeżdżałaby pod panele; klik w zwykłe miejsce na ekranie głównym na razie nic nie robi.

- 14:46 (Paweł, z agentem R3): zakładka Przejażdżki (T-75, makieta D). Podgląd trasy to prawdziwy `POST /v1/routes/plan` dla wybranego czasu, „graj” uruchamia tę samą trasę bez drugiego planowania. Śródmieście i Praga są tylko zapowiedziami, bo historia miejsc obejmuje 1 km od 42 Warsaw.

- R1 (Szczepan, 14:10): w `main` planer z pętlą (PR #9) i poprawką kształtu ostatniego odcinka (PR #11). **Dla R3 (Antek, PR #12):** mock T-16 zastąpiony prawdziwym planerem; `Leg.lngLats` to kształt po ulicach z GTFS (`shapes.txt`), nie same przystanki. Mapa może przejść z `GET /v1/routes/demo` na `POST /v1/routes/plan` (zainteresowania + czas + `returnToStart`), gdy będzie onboarding i slider. Następne w R1: deploy API na Railway (T-62, po terminie), planer na miejscach z Supabase zamiast `places.geojson` (T-19), odjazdy na żywo z `WAW_TOKEN` (T-17).
- Paweł: frontend i generowanie głosu (TTS, T-43). Rola do wpisania w `zespol.md`. **Opowieści (T-45, T-41, T-42, R4) nie mają właściciela**, a to one konsumują `Route.places` i `windowSec` z planera.

- R1 (Szczepan, ok. 14:30): planer jest w `main` (PR #5). Wybór zainteresowań zmieniony na 4 ogólne kategorie: `historical`, `cultural`, `sports`, `nature` (PR w toku). **R3:** onboarding pokazuje te 4 (etykiety PL: historia, kultura, sport, przyroda). **R2:** oznaczyć miejsca kategoriami (T-25, instrukcja w karcie R2): szczegółowe tagi zostają, można też wpisać nazwę kategorii wprost; do `sports` i `nature` potrzebne nowe miejsca (otwarte boiska z API miasta, parki z OSM). Dziś: historia 241 miejsc, kultura 207, sport 0, przyroda 0.

- Sobota 17.10, po 11:00: kod aplikacji wolno pisać.
- Zrobione: mózg zespołu (mapa w `README.md`, `todo.md`, `zespol.md`, karty ról w `role/`), zasady pracy w `CLAUDE.md`.
- Nowe: [11-zasady-pracy-i-kodu.md](11-zasady-pracy-i-kodu.md) (zasady kodu i współpracy) i [12-plan-mvp.md](12-plan-mvp.md) (stack, kontrakt API, harmonogram). Każdy czyta i zgłasza niezgodę z założeniami [Z] (T-64).
- Szkielet monorepo gotowy (T-04): `pnpm install && pnpm dev`. Plan MVP przycięty do listy MVP z PRD, dodatki w `todo.md` w sekcji „Poza MVP”.
- Najbliższe: wpisanie git user.name i ról do `zespol.md` (T-08), inicjalizacja repo aplikacji (T-04), zdjęcie decyzji o API Bielika i Supabase (T-01, T-02).
- Plan bazy miejsc w [13-plan-bazy.md](13-plan-bazy.md) (Jasiek, 13:00): baza Supabase pusta, PostGIS do włączenia; 13:10: schemat i RPC w Supabase (T-20), 13:08: dane załadowane (326 miejsc, 351 zdjęć, T-21). R3 i R4 mogą czytać przez RPC `places_in_bbox`, `place_detail`, R1 przez `places_near_line` (Jasiek). 13:24: port `PlacesRepository` i adapter w `apps/api/src/adapters/supabase/` (T-24); następne: kontrakt `Place`/`PlaceSummary` i `/v1/places`.
- R1 (Szczepan, 13:15): kolejność przystanków i kształty linii z GTFS mkuran.pl (licencja ZTM + ODbL, wymagany podpis), skompresowane do `apps/api/data/`. Planer dopasowuje miejsca do tras **w pamięci API**, wejście to GeoJSON w formacie RPC `places_in_bbox` (teraz z pliku `apps/api/data/places.geojson`, potem z Supabase). **Dla R2 (Jasiek):** RPC `places_near_line` nie będzie używane przez planer; lista `INTERESTS` przenosi się do `packages/shared/src/interests.ts` (te same klucze), `scripts/historia/interests.ts` może ją stamtąd importować; dodaję `scripts/export-places-geojson.ts`, które używa Twojego `mapPlace`.
- Plan mapy w [14-plan-mapy.md](14-plan-mapy.md) (Antek, R3, 13:30): MapLibre zamiast Mapboxa, miejsca przez `GET /v1/places` i `/v1/places/:id` (czeka na R2), trasa z `POST /v1/routes/plan` (czeka na mock T-16 od R1). Kroki 1–3 (mapa, podkład, punkty z fixture) bez zależności.
- Mapa (Antek, 15:00, PR z `r3/maplibre-map`): `/mapa` na MapLibre 5 z miejscami z `GET /v1/places`, kartą z `/v1/places/:id`, filtrem kategorii `?i=` i trasą demo z planera R1. Dev container w `.devcontainer/` (Node 24, pnpm, `node_modules` w wolumenach Dockera), do akceptacji jako konfiguracja wspólna.

- R1 (Szczepan, 14:00): planer działa na prawdziwych danych (GTFS + 326 miejsc z pliku), `POST /v1/routes/plan` i `GET /v1/routes/demo` w PR #4, podgląd na `http://localhost:8787/debug/planner` (`DEBUG_PAGES=1`). `Route.places` to już miejsca do opowieści, co najmniej 45 s od siebie (dla R4). Po ok. 20 min trasa wychodzi poza obszar z danymi.

- R2 (Jasiek, 13:38): `GET /v1/places` i `GET /v1/places/:id` gotowe (kontrakt PR #6, trasy na nim). **R3:** mapa może brać `/v1/places?bbox=…`; **R4:** fakty i źródła z `/v1/places/:id` (`sources[].id` do cytowania, `unverifiedFacts` pomijać). **R1:** dodać `SUPABASE_URL` i `SUPABASE_SERVICE_ROLE_KEY` na Railway.

- R2 (Jasiek, 14:08): sport i przyroda mają miejsca (T-25): +102 z OSM (parki, skwery, obiekty sportowe), w bazie 428 miejsc (historia 242, kultura 113, sport 33, przyroda 75). `apps/api/data/places.geojson` odświeżony dla planera. Następne: zbiór miasta „Otwarte boiska” (T-27, potrzebny token).

- 13:20 (Paweł): deploy działa. Web: https://sawa-hackathon.vercel.app (Vercel, konto Pawła). API: https://api-production-d213.up.railway.app/health (Railway, projekt `sawa`, serwis `api`, auto-deploy z `main`). Railway nie czyta już `apps/api/railway.json`, ustawienia są w serwisie.

- 13:25 (Paweł, z agentem R3): demo mock w `apps/web` (start → onboarding → mapa z suwakiem → trasa z odtwarzaczem), bez API i bez tokena Mapbox, branch `r3/demo-mock`. Do sprawdzenia na telefonie.

- 13:30 (spotkanie): podział Szczepan R1 planer, Jasiek R2 baza, Paweł R3, Antek R4 głos. Scraping kolejnych miejsc czeka na stabilny schemat bazy. Bazę zmienia tylko agent Jaśka. [Podsumowanie](spotkania/2026-10-17-1330-postep-i-podzial.md)

- 13:47 (Paweł, z agentem R3): nowy onboarding (`OnboardingFlow`, 5 kroków, 3 pytania, Sawa w 5 pozach i 15 ikon 3D z fal.ai, sprężyny `motion`). Analiza i projekt: [ui/onboarding.md](ui/onboarding.md). Czeka na podpięcie w `demo-app.tsx` (sesja R3 od mapy). Pytania o znajomość miasta i styl opowieści: R1 + R4 decydują, czy trafią do planera i promptów.

- 13:51 (Paweł, R3): na https://sawa-hackathon.vercel.app działa mock: onboarding sawa-72, ekran główny A6 i trasa z gestami na prawdziwej mapie (MapLibre + OpenFreeMap, bez tokenu). Dane wciąż mockowe (`lib/mock-data.ts`), podpięcie API to T-30/T-10. Zmiany na gałęzi `r3/demo-mock` (część już w commitach, reszta w drzewie roboczym), jeszcze nie w `main`.

- 14:30 (Paweł, R3): gesty jak w iOS. Arkusz trasy ciągnie się za treść i zamyka ściągnięciem w dół, karty ekranu głównego chowają się pod pasek zakładek, strona nie powiększa się i nie odbija. Przetestowane dotykiem w emulacji iPhone; do sprawdzenia na prawdziwym telefonie.

- R2 (Jasiek, 14:30): zbiór miasta „Otwarte boiska” w bazie (T-27): 57 szkolnych terenów sportowych z godzinami otwarcia, adresy geokodowane Nominatim. Razem 485 miejsc, sport 90, przyroda 75. `places.geojson` dla planera odświeżony.
- R1 (Szczepan, 14:40): planer czyta miejsca z Supabase (`listInBBox`, cache 10 min, odświeżanie w tle), przy błędzie lub braku kluczy z `places.geojson` (T-19, PR #17). Na Railway sprawdzić w logach `planner places loaded` z `isFallback: false`.

- 14:50 (Paweł, R3): w `main` całość na live: demo z onboardingiem, trasa z `POST /v1/routes/plan`, piny z `/v1/places`, odtwarzacz opowieści (`POST /v1/stories` + `POST /v1/speech`, głos ElevenLabs, następny punkt ładowany z wyprzedzeniem), panel przejażdżek. Mapa Antka pod `/mapa`. API opowieści i TTS (OpenRouter, ElevenLabs) z gałęzi `r4/stories-llm`.

## Zablokowane

- Auto-deploy weba z GitHuba: aplikacja Vercel nie ma dostępu do repo `Pawel-Uhma/Sawa`. Odblokowuje Paweł (GitHub → Settings → Applications → Vercel). Do tego czasu deploy przez `npx vercel deploy --prod`.

## Otwarte decyzje

Każda ma właściciela (kto rozstrzyga). Po decyzji przenieś ją do właściwego dokumentu i usuń stąd.

| Pytanie | Kto rozstrzyga | Gdzie szukać kontekstu |
|---|---|---|
| Kto robi opowieści (R4: T-45, T-41, T-42) | zespół | [role/R4-ai-i-glos.md](role/R4-ai-i-glos.md) |
| Potwierdzenie stacku z planu MVP: Hono na Railway + monorepo pnpm, 4 role (R5 → R2) | zespół, 12:30 | [12-plan-mvp.md](12-plan-mvp.md) §2, §11 |
| Konta Vercel i Railway: zespołowe czy prywatne | zespół, 12:30 | [12-plan-mvp.md](12-plan-mvp.md) P7 |
| Przycisk „dalej” w opowieści: MVP czy później | zespół | [spotkania/2026-10-17-1100-mvp-sawy.md](spotkania/2026-10-17-1100-mvp-sawy.md) |
| Git: PR do `main` czy bezpośredni push (agenci pushują wprost, są konflikty) | zespół | [spotkania/2026-10-17-1330-postep-i-podzial.md](spotkania/2026-10-17-1330-postep-i-podzial.md) |
| Dziennik AI: wyłączyć hook i na koniec opisać użycie AI (§4 ust. 4), czy zostawić | zespół, R2 (T-53) | [spotkania/2026-10-17-1330-postep-i-podzial.md](spotkania/2026-10-17-1330-postep-i-podzial.md) |
| Planer: ile miejsc na trasę (30 min daje teraz 120) | R1 | [spotkania/2026-10-17-1330-postep-i-podzial.md](spotkania/2026-10-17-1330-postep-i-podzial.md) |
| Kto prezentuje, jeśli Ala nie dojedzie (zdalnie przez FaceTime?) | zespół | [spotkania/2026-10-17-1330-postep-i-podzial.md](spotkania/2026-10-17-1330-postep-i-podzial.md) |
| Toalety: brak zbioru w portalu, OSM czy rezygnacja | R1 | [spotkania/2026-10-17-1100-mvp-sawy.md](spotkania/2026-10-17-1100-mvp-sawy.md) |
| Tryb „z wysiadaniem” (muzea): MVP czy po MVP | zespół | [10-prd.md](10-prd.md) |
| Scraping muzeów i wystaw pod zainteresowania | zespół | [spotkania/2026-10-17-1100-mvp-sawy.md](spotkania/2026-10-17-1100-mvp-sawy.md) |
| API Bielika: gdzie hostowane, limity; zapasowy LLM | R4 | [05-plan-architektury.md](05-plan-architektury.md) |
| Rozpoznawanie powracającego użytkownika bez konta | zespół (dodatek, jeśli zostanie czas) | [spotkania/2026-10-17-1100-mvp-sawy.md](spotkania/2026-10-17-1100-mvp-sawy.md) |
| Zasady pracy z repo (gałęzie, PR, merge) | zespół | [spotkania/2026-10-17-1130-stack-repo-domena.md](spotkania/2026-10-17-1130-stack-repo-domena.md) |
| Zdanie o wdrożeniu dla jury (Sawa obok Warszawa 19115) | R5 | [06-plan-dnia.md](06-plan-dnia.md) |
| Tryb trasy w MVP: (a) „jak dojadę”, (b) przejażdżka z czasem, (c) start–koniec | zespół | [spotkania/2026-10-17-wieczor-podzial-i-ui.md](spotkania/2026-10-17-wieczor-podzial-i-ui.md) |
| Czat z Sawą w MVP (T-34) czy tylko na prezentacji | zespół | [spotkania/2026-10-17-wieczor-podzial-i-ui.md](spotkania/2026-10-17-wieczor-podzial-i-ui.md) |
| Grupa docelowa (przyjezdni czy mieszkańcy) i format: podcast dwóch głosów czy narracja | zespół (przy PRD) | [spotkania/2026-10-17-wieczor-jury-koncept.md](spotkania/2026-10-17-wieczor-jury-koncept.md) |
| Hook auto-push z rozwiązywaniem konfliktów; wspólna gałąź czy osobne | zespół (przy T-62) | [spotkania/2026-10-17-wieczor-podzial-i-ui.md](spotkania/2026-10-17-wieczor-podzial-i-ui.md) |

## Ostatnie decyzje

- 17.10, 13:37: zainteresowania to 4 ogólne kategorie `historical`, `cultural`, `sports`, `nature` (`packages/shared/src/interests.ts`, PR #7); szczegółowe tagi zostają w danych. Zastępuje listę 8 kluczy z [13-plan-bazy.md §5](13-plan-bazy.md). Zdecydował Szczepan (R1).

- 17.10, 13:43: Google Places tylko z danych pobranych 15–16.10 (warstwa `dzis`, 506 obiektów przy 224 miejscach, i 55 rekordów `g-*`), **bez zapytań na żywo i bez klucza**. W API jako `Place.todayNearby`; w UI podpis „Google Maps”. Warunki Google: treść max 30 dni, po hackathonie usunąć albo odświeżyć. Zdecydował Jasiek (R2). T-23 odpada.
- 17.10, 13:31: bez dziennika AI. Hook `log-prompt.sh` usunięty, reguła `**AI:**` z `CLAUDE.md` wycofana, `ai-log.md` zostaje jako archiwum. Opis użycia AI na oddanie robi R2 (T-53). Zdecydował Jasiek (R2, właściciel T-53).
- 17.10, 13:40: mapa na MapLibre (nie Mapbox); na mapie wszystkie miejsca niezależnie od `richness`, próg w stałej `MIN_PLACE_RICHNESS`, bez przełącznika w UI. Decyzja Antka (R3). [14-plan-mapy.md](14-plan-mapy.md)
- 17.10, 13:55: TTS w API gotowe na gałęzi `r4/tts-elevenlabs` (Pawel): `POST /v1/speech {text}` zwraca mp3, głos Asia, Multilingual v2, stabilność 0,3 / wierność 0,7 / ekspresja 0,9 / tempo 1,05. Liczby i daty LLM musi pisać słownie, bo cyfry TTS czyta źle. Tagi typu [sighs] nie działają w v2.
- 17.10, 13:30: głos to ElevenLabs (ok. 0,50 zł/min, klucz w Railway), integracja R4. Użytkowników nie trzymamy w bazie. [Podsumowanie](spotkania/2026-10-17-1330-postep-i-podzial.md)

- 17.10, wieczór (rozmowa z jury): problem to przyjezdni w Warszawie; konkurencja to aplikacja Warsaw Polish Guide, nie powielamy jej funkcji. [Podsumowanie](spotkania/2026-10-17-wieczor-jury-koncept.md)
- 17.10, wieczór: ekran główny to wariant A (arkusz na mapie, mobile); język: docs po polsku, kod po angielsku; commit podpisuje osoba, nie agent. [Podsumowanie](spotkania/2026-10-17-wieczor-podzial-i-ui.md)
- 17.10: backend na Railway; zostajemy przy darmowej subdomenie Vercela. [05-plan-architektury.md](05-plan-architektury.md)
- 17.10: mapa na Mapbox (styl własny; R3). Token trzymamy poza repo. [05-plan-architektury.md](05-plan-architektury.md)
- 17.10: projekt to Sawa (pomysł) i wyzwanie 1 „Warszawa 2076”. [README](README.md)

- 17.10, 11:30: stack Next.js + Supabase + Vercel potwierdzony; repo z dokumentacją i klucz API na Discordzie zespołu. [Podsumowanie](spotkania/2026-10-17-1130-stack-repo-domena.md)
- 17.10, 11:45: backend jako osobna usługa Hono (TypeScript) na Railway, monorepo pnpm, dokumenty po polsku, kod po angielsku, 4 role (R5 rozwiązana, zadania ma R2). Ustalone przez Szczepana, do potwierdzenia przez zespół. [12-plan-mvp.md](12-plan-mvp.md)

- 17.10: MVP to historia miejsc; podcast z okna w komunikacji; bez logowania; Supabase na koncie zespołu. [Podsumowanie](spotkania/2026-10-17-1100-mvp-sawy.md)
- 17.10: historia to punkt na mapie, format GeoJSON + Markdown, treść generuje LLM na żywo. [historia/README.md](historia/README.md)
