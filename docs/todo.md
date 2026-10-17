# Todo zespołu

**Ostatnia aktualizacja:** 17.10.2026, ok. 16:10

**Źródło prawdy dla zadań.** Każdy agent i każda osoba czyta tę listę przed pracą i aktualizuje ją po pracy.

## Legenda

- `- [ ]` do zrobienia
- `- [~]` w toku: dopisz kto i od kiedy, np. `(Antek, od 12:10)`
- `- [x]` zrobione: dopisz godzinę, np. `(Janek, 13:05)`
- Tag roli na końcu linii (`R1`–`R4`, `Wszyscy`; dawne zadania R5 ma R2): kto odpowiada. Pełna lista ról w [zespol.md](zespol.md).
- Terminy to plan z [06-plan-dnia.md](06-plan-dnia.md). Zadanie po terminie oznacz w `stan.md` jako zablokowane.

## Start i wspólne (sobota 17.10)

- [ ] **T-08** Każdy wpisuje swój `git user.name` i rolę w [zespol.md](zespol.md), zanim zacznie pracę — `Wszyscy` — 11:45
- [ ] **T-03** Każdy ma token API dane.um.warszawa.pl w `.env.local` (nie w git); klucz jest na Discordzie zespołu — `Wszyscy` — 11:30
- [ ] **T-09** Konta: GitHub (repo), Vercel, dostęp do LLM — `Wszyscy` — 12:00
- [ ] **T-02** Projekt Supabase na koncie zespołu (nie prywatnym); kto zakłada, do potwierdzenia — `R2` — 13:00
- [x] **T-04** Monorepo: pnpm, `apps/web` (Next 16), `apps/api` (Hono, `/health`), `packages/shared`, Biome, Vitest, CI w GitHub Actions — `R3` — (Szczepan, 12:05; projekty Vercel i Railway jeszcze nie założone)
- [x] **T-62** Projekt Railway dla `apps/api`, deploy `/health`, zmienne env, CORS dla Vercela — `R1` — 13:30 (zrobił Paweł z agentem na swoje polecenie, 13:20: https://api-production-d213.up.railway.app; Dockerfile i `railway.json` od Szczepana w PR #15)
- [ ] **T-63** Kontrakt v0 w `packages/shared` (§5 planu MVP): `Place`, `Route`, `Story` i reszta, zatwierdzony na synchronizacji — `Wszyscy` — 13:30
- [ ] **T-64** Każdy czyta [11-zasady-pracy-i-kodu.md](11-zasady-pracy-i-kodu.md) i zgłasza w `stan.md` niezgodę z założeniami [Z] z [12-plan-mvp.md](12-plan-mvp.md) §11 — `Wszyscy` — 12:30
- [ ] **T-01** Sprawdzić API Bielika (gdzie, limity, szybkość); wybrać zapasowy LLM — `R4` — 13:00

- [x] **T-65** Mapa: Mapbox (styl i renderer), decyzja R3, 17.10 — `R3` — 13:00 (plan MVP mówi MapLibre, do uzgodnienia w `stan.md`)
- [ ] **T-05** Decyzja o toaletach (OSM czy rezygnacja) — `R1` — 14:00
- [ ] **T-06** Decyzja o Google Places (klucz każdego czy tylko Wikipedia) — `R2` — 14:00
- [x] **T-69** Zasady pracy z repo (dawne T-62 Pawła): pokryte przez [11-zasady-pracy-i-kodu.md](11-zasady-pracy-i-kodu.md) — `Wszyscy`

## R1 · Dane i planer tras

- [x] **T-19** Planer bierze miejsca z Supabase (`PlacesRepository.listInBBox`) zamiast z `apps/api/data/places.geojson`, żeby nowe miejsca z T-25 trafiały do tras bez eksportu pliku — `R1` — 17:00 (Szczepan, 14:38, PR #17)
- [x] **T-65** Pętla z powrotem do startu (`returnToStart`, PR #9) i kształt odcinka do ostatniego przystanku (PR #11) — `R1` — (Szczepan, 13:58)
- [x] **T-66** Wybór punktu końcowego trasy (`destination`, `endsAtDestination`) — `R1` — (Szczepan, 14:40, PR #19)
- [x] **T-76** Odjazdy z rozkładu ZTM dla każdego odcinka trasy, także przesiadek, `Leg.realDeparture` w kontrakcie — `R1` — (Szczepan, 15:00, PR #19; z prawdziwym tokenem do sprawdzenia w T-17)
- [x] **T-77** Odpowiedzi z onboardingu w planerze: znajomość miasta, styl opowieści; web wysyła je z `planRoute` — `R1` — (Szczepan, 16:30, PR #22; 17:20 bez kafelków `tags`, front ma tylko 4 kategorie)
- [x] **T-78** Pamięć słuchacza (opowiedziane fakty i tło w telefonie, `heard` w planerze, `heardFacts`/`knownContexts` w opowieściach) i onboarding z 4 kategoriami — `R3` — (Paweł z agentem, 16:40; zmiana w `score.ts` R1 na polecenie Pawła, do akceptacji Szczepana)
- [x] **T-79** Trasy od 5 min i odcinki piesze (`Leg.mode` `walk`, spacer poniżej 30 min, dojścia do i z przystanków) — `R1` — (Szczepan, 17:50, PR w toku)
- [ ] **T-10** Adapter `apps/api/src/adapters/waw` (przystanki, linie, odjazdy) z cache w pamięci i fixtures z curl — `R1` — 15:00 (do przeglądu: mapa bierze miejsca z `/v1/places`, planer jedzie na GTFS, w MVP może zostać tylko odjazdy z T-17)
- [x] **T-15** Skąd kolejność przystanków linii (GTFS / stare API / kształt z pozycji pojazdów), decyzja w `stan.md` (P1 w planie MVP) — `R1` — 13:30 (Szczepan, 13:15: GTFS z mkuran.pl, skompresowany do pliku w repo)
- [x] **T-16** Mock `POST /v1/routes/plan` z fixture zgodnej z kontraktem, żeby R3 i R4 nie czekali — `R1` — 14:30 (Szczepan, 13:20, PR #2; od 14:00 zastąpiony prawdziwym planerem)
- [ ] **T-11** Odjazdy z przystanku i linie na przystanku (endpointy z [api/](api/)) — `R1` — 15:00
- [ ] **T-12** Kalendarz wydarzeń i pogoda (zbiory z [03-dane.md](03-dane.md)) — `R1` — 17:00
- [x] **T-13** Planer: trasa z przesiadkami, czas 30 min – 4 h, lista punktów — `R1` — 22:00 (Szczepan, 14:00: GTFS + beam search, podgląd `/debug/planner`, PR #4)
- [~] **T-17** `WAW_TOKEN` w `apps/api/.env.local` i na Railway, sprawdzić odjazdy na żywo (format odpowiedzi API nie był testowany z tokenem) — `R1` — 17:00 (Szczepan, 15:40: lokalnie działa; API zwraca gołą tablicę wierszy, nie `{ result }`, poprawka parsera w PR; zostało: `WAW_TOKEN` na Railway)
- [ ] **T-18** Przed demo: przebudować graf na niedzielę (`pnpm --filter @sawa/scripts transit --date 2026-10-18`) i zapisać trasę demo jako fixture do trybu offline — `R1` — niedziela 08:00
- [x] **T-99** Pojazdy na żywo pod mapę: pojazd użytkownika + po jednym przed i za nim, tor do płynnej animacji, prędkość z przejazdu poprzednika tej samej linii; `POST /v1/vehicles/track`, kontrakt w `packages/shared/src/schemas/vehicles.ts`. Opis: [15-pojazdy-na-zywo.md](15-pojazdy-na-zywo.md) — `R1` (zrobił Jasiek na prośbę użytkownika, gałąź `r1/live-vehicles`) — (Jasiek, 16:30; na Railway potrzebne `WAW_TOKEN` (T-17) i w dniu demo `VEHICLES_ALWAYS_ON=1`, wpisane w [przed-demo.md](przed-demo.md))

## R2 · Baza i historia

- [x] **T-20** Schemat Supabase dla miejsc: punkt, opis, źródła, zdjęcia, licencja, wersja EN — `R2` — 13:00 (Jasiek, 13:10: migracje w bazie)
- [x] **T-21** Załadować [historia/sawa-historia.geojson](historia/sawa-historia.geojson) do Supabase skryptem (nie ręcznie) — `R2` — 15:00 (Jasiek, 13:08: 326 miejsc i 351 zdjęć w bazie, `pnpm --filter @sawa/scripts seed:historia`)
- [x] **T-22** Sprawdzić licencje zdjęć w [historia/zdjecia.json](historia/zdjecia.json), odfiltrować te bez licencji — `R2` — 17:00 (Jasiek, 12:55: na razie pomijamy licencje, użytek własny; wgrywamy wszystkie zdjęcia z polem licencji)
- [x] **T-24** Port `PlacesRepository` + adapter Supabase (RPC, zod, timeout 5 s) + `fake` na 5 miejscach; trasy `/v1/places` czekają na kontrakt `Place`/`PlaceSummary` w `packages/shared` — `R2` — (Jasiek, 13:24)
- [x] **T-26** `GET /v1/places?bbox=&interests=` (GeoJSON dla MapLibre) i `GET /v1/places/:id` (pełne miejsce dla opowieści), kontrakt w PR #6; na Railway potrzebne `SUPABASE_URL` i `SUPABASE_SERVICE_ROLE_KEY` (R1), bez nich API daje 5 miejsc z fake — `R2` — (Jasiek, 13:38)
- [x] **T-25** Oznaczyć miejsca kategoriami, które wybiera użytkownik: `historical`, `cultural`, `sports`, `nature` (kolumna `places.interests`). Szczegóły w karcie [R2](role/R2-baza-i-historia.md#kategorie-zainteresowań-od-1710-1430). Najpierw `sports` i `nature`, bo dziś mają 0 miejsc. Po zmianie: seed i `pnpm --filter @sawa/scripts export:places` (plik dla planera) — `R2` — 17:00 (Jasiek, 14:08: +102 miejsca z OSM w `docs/historia/osm-sport-przyroda.geojson`, reguły sport/przyroda po nazwie; w bazie 428 miejsc: historia 242, kultura 113, sport 33, przyroda 75; seed i `export:places` zrobione)
- [x] **T-27** Sport ze zbioru miasta „Otwarte boiska” (`docs/api/otwarte-boiska.md`): pobrać, zgeokodować adresy, dopisać do `osm-sport-przyroda.geojson` lub osobnego pliku w `historia/sources.ts`; potrzebny token dane.um.warszawa.pl w `.env.local` (`WAW_TOKEN`) — `R2` — 19:00 (Jasiek, 14:30: 57 szkół w obszarze tras w `docs/historia/um-otwarte-boiska.geojson`, `fetch:boiska`; sport w bazie 90 miejsc, łącznie 485)

## R3 · Frontend i mapa

- [~] **T-30** Mapa MapLibre z jednym zbiorem punktów, dane z T-10 — `R3` — 13:00 (Antek, od 13:30; plan w [14-plan-mapy.md](14-plan-mapy.md); 15:00: `/mapa` z miejscami z API, kartą miejsca i trasą demo, PR z `r3/maplibre-map`; 16:07: miejsca z kafelków widoku zamiast stałego bbox, cała Warszawa, gałąź `r3/places-viewport`)
- [~] **T-30b** Mapa w demo (ekran główny) z jednym zbiorem punktów, dane z T-10 — `R3` — 13:00 (Paweł z agentem, 13:51: prawdziwa mapa MapLibre + OpenFreeMap w barwach Sawy, bez tokenu; punkty i trasa z docs/historia i makiet, jeszcze nie z T-10)
- [x] **T-66** Ekran główny według wariantu A (arkusz na mapie), mobile-first — `R3` — (Paweł z agentem, 17.10 13:25: mock bez API, mapa szkicowa zamiast Mapbox; 13:51: wariant A6 z makiety, Sawa z dymkiem, pasek zakładek, prawdziwa mapa)
- [x] **T-67** Wersja desktopowa (ten sam UI na szerokim ekranie) — `R3` — (Paweł z agentem, 17.10 13:25: panel boczny od 768 px, mock; 13:51: mapa na cały ekran, pływający szklany panel 360/400 px, kamera omija panel, skróty klawiszowe w trasie)
- [x] **T-31** Onboarding: ekran startowy i wybór ok. 3 zainteresowań — `R3` — (Paweł z agentem, 17.10 13:25: mock, lista 8 kluczy z 13-plan-bazy §5; 13:47: nowy przepływ z Sawą, 3 pytania i grafikami z fal.ai, [ui/onboarding.md](ui/onboarding.md); do podpięcia w demo-app przez sesję R3 od mapy)
- [x] **T-32** Slider czasu (30 min – 4 h) i przycisk „generuj” — `R3` — (Paweł z agentem, 17.10 13:25: mock)
- [x] **T-33** Widok trasy: lista punktów i odtwarzacz opowieści (pauza, przejście do następnego; „dalej” wg decyzji) — `R3` — (Paweł z agentem, 17.10 13:25: mock, tekst opowieści to placeholder, czeka na T-42; 14:50: odtwarzacz gra opowieść z API głosem ElevenLabs)
- [x] **T-35** Wersja mobilna: 16 px marginesu, bez poziomego scrolla — `R3` — 22:00 (Paweł z agentem, 13:51: arkusz trasy z 3 punktami zatrzymania i rzutem, swipe opowieści, sprężyny motion, safe area, reduced motion; sprawdzone 390–1920 px bez poziomego scrolla)
- [ ] **T-36** Podstrona demo: stała lokalizacja, symulowana jazda ok. 1,5 min — `R3` — niedziela 08:00
- [ ] **T-78** Cel przejażdżki w UI: wybór punktu końcowego (stuknięcie w mapę albo karta miejsca) i `destination: { lat, lng }` w `planRoute` (`apps/web/src/features/demo/lib/api-data.ts`); przy `endsAtDestination: false` pokazać, że trasa nie kończy się przy celu. Bez `returnToStart` jednocześnie. API gotowe na Railway (PR #19) — `R3` — (zgłosił Szczepan, R1)
- [x] **T-101** Najszybsza trasa do celu: `POST /v1/routes/plan` z `destination` bez `durationMin`; trasa z czasem, która nie dojeżdża do celu, przechodzi na najszybszy przejazd — `R1` — (Szczepan, 19:10, PR w toku)
- [ ] **T-100** Pojazdy na mapie trasy: hook `useLiveVehicles` (co 10 s), osobne ikony tramwaju i autobusu, płynny ruch przez `positionOnTrack` w `requestAnimationFrame`, wyróżniony pojazd `ride`. Gotowe przykłady kodu w [15-pojazdy-na-zywo.md](15-pojazdy-na-zywo.md) — `R3` (Paweł, issue #30) — po T-99 (PR #29)
- [x] **T-60** Pierwszy deploy na Vercel — `R3` — 22:00 (Paweł, 13:20: https://sawa-hackathon.vercel.app; auto-deploy z GitHuba czeka na dostęp aplikacji Vercel do repo)

## R4 · AI i głos

Paweł robi frontend i generowanie głosu (T-43). Opowieści (T-45, T-41, T-42) nie mają jeszcze właściciela, zob. `stan.md`.

- [~] **T-45** Port `LlmProvider` z implementacjami `bielik`, `claude`, `fake` i `POST /v1/stories` z `story_cache` — `R4` — 17:00 (Paweł, 14:50: w `main` OpenRouter + `POST /v1/stories` i `/v1/stories/audio`, cache w pamięci; Bielik i `story_cache` w Supabase jeszcze nie)
- [ ] **T-40** Endpoint `chat` w backendzie na Railway z LLM (Bielik lub zapasowy); klucz tylko na serwerze — `R4` — 17:00
- [ ] **T-41** Prompt Sawy: persona rówieśniczki, która mieszka w Warszawie rok, zasady „fakty ze źródłami, bez zmyślania” — `R4` — 20:00
- [ ] **T-42** Opowieść „z okna”: tekst o punkcie na trasie z faktów z Supabase; długość zależna od czasu do punktu — `R4` — 22:00

## R2 · Produkt, pitch i QA (dawna R5)

- [ ] **T-50** Scenariusz demo 1,5 min (ścieżka z [10-prd.md](10-prd.md)) i tekst pitcha 5 min — `R2` — 15:00
- [ ] **T-51** Zaktualizować pitch deck w [pitch/](pitch/) pod MVP — `R2` — 22:00
- [ ] **T-52** Test na telefonie co 2 h: wszystkie ścieżki z PRD, zgłoszenia w tym pliku (robią wszyscy na zmianę, R2 pilnuje) — `R2` — od 17:00
- [ ] **T-55** Nagranie wideo demo jako zapas — `R2` — 22:00
- [ ] **T-53** Opis zakresu użycia AI (z historii git, PR-ów i archiwum `ai-log.md`) i dokumentacja na oddanie (`README.md`, regulamin §4 ust. 4) — `R2` — niedziela 10:30
- [ ] **T-54** Checklista z [06-plan-dnia.md](06-plan-dnia.md): repo, deck, dokumentacja, nagranie — `R2` — niedziela 10:30

## Z przeglądu stanu (Jasiek, 15:00; numery T-90+, bo T-76 zajął R1)

- [x] **T-90** Railway nie wdraża `main` (stoi na `19c97a1`): sprawdzić auto-deploy i watch paths serwisu, wdrożyć `main`, potwierdzić `version` w `/health`; bez tego odtwarzacz na produkcji daje 404 — `R3` (Paweł, konto Railway) — (16:10, Jasiek: sprawdzone, `/health` pokazuje 01ed0e3)
- [x] **T-91** Zmienne na Railway: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_KEY`, `ELEVENLABS_KEY`; sprawdzić w logach `api listening` i `planner places loaded` (`isFallback: false`) — `R3` (Paweł) — (16:10, Jasiek: sprawdzone z zewnątrz: `/v1/places` 1303 miejsc z bazy, `/v1/stories` z LLM, `/v1/speech` daje mp3)
- [ ] **T-92** `POST /v1/speech` przyjmuje dowolny tekst bez limitu zapytań (każdy może zużyć kredyty ElevenLabs): web na `/v1/stories/audio`, a `/v1/speech` wyłączyć albo dodać rate limit — `R4`
- [ ] **T-93** Odtwarzacz (`story-player.ts`) trzyma klipy po samym `stop.id`: po zmianie zainteresowań lub czasu gra starą opowieść o złej długości; klucz z zainteresowaniami i `targetSec` — `R3`
- [ ] **T-94** Cache opowieści i głosu jest w pamięci, restart Railway go czyści: przed pitchem rozgrzać trasę demo albo zapisać ją jako fixture (z T-18, T-36) — `R1` + `R3` — niedziela 08:00
- [ ] **T-95** Pokazać zbiór z dane.um.warszawa.pl na scenie: dziś tylko „Otwarte boiska” (sport), transport idzie z GTFS mkuran.pl, `WAW_TOKEN` nieustawiony (T-17). Ścieżka demo musi go zawierać, pitch musi go nazwać — `R2` (z T-50) + `R1`
- [x] **T-96** Dwie mapy (`features/demo/` Pawła na `/` i `features/map/` Antka na `/mapa`): zdecydować, która idzie na demo, drugą zamrozić — `R3` — (Paweł, 14:54: demo używa `SawaMap` Antka, stara mapa usunięta)
- [ ] **T-97** Zdjęcia bez sprawdzonej licencji (T-22 zamknięte decyzją „pomijamy”): na demo i w decku tylko zdjęcia z licencją i autorem albo z podpisem źródła — `R2`
- [ ] **T-98** Opowieść z produkcji ma cyfry („założone w 1867 roku”), a TTS czyta je źle (decyzja 13:55: LLM pisze liczby słownie): dopisać to do promptu albo zamieniać cyfry przed `/v1/speech` — `R4`

## Wszyscy · końcówka

- [ ] **T-68** Sprawdzić repo pod kątem kluczy API i tokenów przed pierwszym pushem — `Wszyscy` — przed pushem
- [ ] **T-61** Zamrożenie zmian w kodzie, tylko poprawki błędów — `Wszyscy` — niedziela 09:00

## Poza MVP (nie ruszamy bez decyzji zespołu w `stan.md`)

Zakres to tylko lista MVP z [10-prd.md](10-prd.md), zob. [12-plan-mvp.md](12-plan-mvp.md) §10.

- [ ] **T-05** Decyzja o toaletach (OSM czy rezygnacja) — `R1` — 14:00
- [x] **T-06** Decyzja o Google Places (klucz każdego czy tylko Wikipedia) — `R2` — 14:00 (Jasiek, 13:43: używamy danych Google pobranych 15–16.10, bez zapytań na żywo i bez klucza; warstwa `dzis` → `places.today_nearby`, `Place.todayNearby`)
- [ ] **T-12** Kalendarz wydarzeń i pogoda (zbiory z [03-dane.md](03-dane.md)) — `R1` — 17:00
- [ ] **T-14** Przewidywanie, co będzie za oknem za X s (pozycja + rozkład); przy korku dłuższa historia — `R1` — po 22:00
- [x] **T-23** ~~Cache Google Places w Supabase~~ niepotrzebne: nie odpytujemy Google na żywo (T-06) — `R2` — (Jasiek, 13:43)
- [ ] **T-34** Zakładka czatu z Sawą (UI, podpięcie do T-40) — `R3` — noc
- [x] **T-75** Zakładka Przejażdżki (makieta D): przełącznik czasu, karta trasy z podglądem z planera, zapowiedzi Śródmieścia i Pragi — `R3` — (Paweł z agentem, 17.10 14:46)
- [ ] **T-40** `POST /v1/chat` (SSE) z LLM (Bielik lub zapasowy); klucz tylko na serwerze — `R4` — 17:00
- [x] **T-43** TTS: wybrany ElevenLabs (17.10, 13:30), test polskiego w ramach T-71 — `R4`
- [ ] **T-44** Awatar Sawy wygenerowany od zera po 11:00 wg [awatar/](awatar/) — `R4` — 15:00

## Ze spotkania 13:30

- [x] **T-70** Planer: limit miejsc na trasie albo minimalny czas na opowieść (30 min daje teraz 120 miejsc) — `R1` — (Jasiek 14:45: na produkcji 30 min 9 miejsc, 120 min 15; Szczepan, 18:30: liczba miejsc już nie 120, ok. 2–5 na 10 min; naprawione okna: min. odstęp stylu także na końcu, maks. 60/120/300 s, opowieści na dojściu do przystanku; PR w toku)
- [~] **T-71** Integracja ElevenLabs w API (`ELEVENLABS_KEY` w Railway) — `R4` → zrobił Pawel na własną prośbę (17.10, 13:55), gałąź `r4/tts-elevenlabs`: `POST /v1/speech` → mp3 głosem Asi, cache w pamięci. W `main` od 14:50
- [ ] **T-72** Styl mapy Mapbox i kategorie punktów (budynek, ulica, pomnik…) z ikonami — `R3`
- [x] **T-73** Scraping kolejnych miejsc (budynki → Wikipedia) prosto do Supabase — `R2` — (Jasiek z agentami, 15:50: 1092 miejsc; 16:30: 1347 miejsc na całą Warszawę, w tym 260 poza pasem Śródmieście–Praga; zabytki z OSM + Wikipedia w `docs/historia/osm-historia.geojson`, parki, sport i „Otwarte boiska” z 18 dzielnic; seed i `export:places` zrobione)
- [ ] **T-74** Opisać w `docs/` repo przydatne na hackathon (link na Discordzie zespołu) — `Wszyscy` (kto znalazł)

## Zrobione

- [x] **T-63** Backend: Railway — decyzja 17.10, 11:40
- [x] **T-64** Domena: darmowa subdomena Vercela — decyzja 17.10, 11:40

- [x] **T-07** Zasady pracy i mózg zespołu — zrobione 17.10 ok. 11:30
