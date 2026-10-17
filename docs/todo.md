# Todo zespołu

**Ostatnia aktualizacja:** 17.10.2026, ok. 11:50

**Źródło prawdy dla zadań.** Każdy agent i każda osoba czyta tę listę przed pracą i aktualizuje ją po pracy.

## Legenda

- `- [ ]` do zrobienia
- `- [~]` w toku: dopisz kto i od kiedy, np. `(Antek, od 12:10)`
- `- [x]` zrobione: dopisz godzinę, np. `(Janek, 13:05)`
- Tag roli na końcu linii (`R1`–`R4`, `Wszyscy`; dawne zadania R5 ma R2): kto odpowiada. Pełna lista ról w [zespol.md](zespol.md).
- Terminy to plan z [06-plan-dnia.md](06-plan-dnia.md). Zadanie po terminie oznacz w `stan.md` jako zablokowane.

## Start i wspólne (sobota 17.10)

- [ ] **T-08** Każdy wpisuje swój `git user.name` i rolę w [zespol.md](zespol.md), zanim zacznie pracę — `Wszyscy` — 11:45
- [ ] **T-03** Każdy ma token API dane.um.warszawa.pl w `.env.local` (nie w git) — `Wszyscy` — 11:30
- [ ] **T-09** Konta: GitHub (repo), Vercel, dostęp do LLM — `Wszyscy` — 12:00
- [ ] **T-02** Projekt Supabase na koncie zespołu (nie prywatnym); kto zakłada, do potwierdzenia — `R2` — 13:00
- [x] **T-04** Monorepo: pnpm, `apps/web` (Next 16), `apps/api` (Hono, `/health`), `packages/shared`, Biome, Vitest, CI w GitHub Actions — `R3` — (Szczepan, 12:05; projekty Vercel i Railway jeszcze nie założone)
- [ ] **T-62** Projekt Railway dla `apps/api`, deploy `/health`, zmienne env, CORS dla Vercela — `R1` — 13:30
- [ ] **T-63** Kontrakt v0 w `packages/shared` (§5 planu MVP): `Place`, `Route`, `Story` i reszta, zatwierdzony na synchronizacji — `Wszyscy` — 13:30
- [ ] **T-64** Każdy czyta [11-zasady-pracy-i-kodu.md](11-zasady-pracy-i-kodu.md) i zgłasza w `stan.md` niezgodę z założeniami [Z] z [12-plan-mvp.md](12-plan-mvp.md) §11 — `Wszyscy` — 12:30
- [ ] **T-01** Sprawdzić API Bielika (gdzie, limity, szybkość); wybrać zapasowy LLM — `R4` — 13:00

## R1 · Dane i planer tras

- [ ] **T-10** Adapter `apps/api/src/adapters/waw` (przystanki, linie, odjazdy) z cache w pamięci i fixtures z curl — `R1` — 15:00
- [x] **T-15** Skąd kolejność przystanków linii (GTFS / stare API / kształt z pozycji pojazdów), decyzja w `stan.md` (P1 w planie MVP) — `R1` — 13:30 (Szczepan, 13:15: GTFS z mkuran.pl, skompresowany do pliku w repo)
- [x] **T-16** Mock `POST /v1/routes/plan` z fixture zgodnej z kontraktem, żeby R3 i R4 nie czekali — `R1` — 14:30 (Szczepan, 13:20, PR #2; od 14:00 zastąpiony prawdziwym planerem)
- [ ] **T-11** Odjazdy z przystanku i linie na przystanku (endpointy z [api/](api/)) — `R1` — 15:00
- [x] **T-13** Planer: trasa z przesiadkami, czas 30 min – 4 h, lista punktów — `R1` — 22:00 (Szczepan, 14:00: GTFS + beam search, podgląd `/debug/planner`, PR #4)
- [ ] **T-17** `WAW_TOKEN` w `apps/api/.env.local` i na Railway, sprawdzić odjazdy na żywo (format odpowiedzi API nie był testowany z tokenem) — `R1` — 17:00
- [ ] **T-18** Przed demo: przebudować graf na niedzielę (`pnpm --filter @sawa/scripts transit --date 2026-10-18`) i zapisać trasę demo jako fixture do trybu offline — `R1` — niedziela 08:00

## R2 · Baza i historia

- [x] **T-20** Schemat Supabase dla miejsc: punkt, opis, źródła, zdjęcia, licencja, wersja EN — `R2` — 13:00 (Jasiek, 13:10: migracje w bazie)
- [x] **T-21** Załadować [historia/sawa-historia.geojson](historia/sawa-historia.geojson) do Supabase skryptem (nie ręcznie) — `R2` — 15:00 (Jasiek, 13:08: 326 miejsc i 351 zdjęć w bazie, `pnpm --filter @sawa/scripts seed:historia`)
- [x] **T-22** Sprawdzić licencje zdjęć w [historia/zdjecia.json](historia/zdjecia.json), odfiltrować te bez licencji — `R2` — 17:00 (Jasiek, 12:55: na razie pomijamy licencje, użytek własny; wgrywamy wszystkie zdjęcia z polem licencji)
- [x] **T-24** Port `PlacesRepository` + adapter Supabase (RPC, zod, timeout 5 s) + `fake` na 5 miejscach; trasy `/v1/places` czekają na kontrakt `Place`/`PlaceSummary` w `packages/shared` — `R2` — (Jasiek, 13:24)
- [x] **T-26** `GET /v1/places?bbox=&interests=` (GeoJSON dla MapLibre) i `GET /v1/places/:id` (pełne miejsce dla opowieści), kontrakt w PR #6; na Railway potrzebne `SUPABASE_URL` i `SUPABASE_SERVICE_ROLE_KEY` (R1), bez nich API daje 5 miejsc z fake — `R2` — (Jasiek, 13:38)
- [ ] **T-25** Oznaczyć miejsca kategoriami, które wybiera użytkownik: `historical`, `cultural`, `sports`, `nature` (kolumna `places.interests`). Szczegóły w karcie [R2](role/R2-baza-i-historia.md#kategorie-zainteresowań-od-1710-1430). Najpierw `sports` i `nature`, bo dziś mają 0 miejsc. Po zmianie: seed i `pnpm --filter @sawa/scripts export:places` (plik dla planera) — `R2` — 17:00

## R3 · Frontend i mapa

- [~] **T-30** Mapa MapLibre z jednym zbiorem punktów, dane z T-10 — `R3` — 13:00 (Antek, od 13:30; plan w [14-plan-mapy.md](14-plan-mapy.md); 14:30 na gałęzi `r3/maplibre-map`: `/mapa` z podkładem, punktami z fixture, filtrem `?i=`, kartą miejsca `?p=` i trasą demo z API; czeka na `GET /v1/places` od R2)
- [ ] **T-31** Onboarding: ekran startowy i wybór ok. 3 zainteresowań — `R3` — 17:00
- [ ] **T-32** Slider czasu (30 min – 4 h) i przycisk „generuj” — `R3` — 17:00
- [ ] **T-33** Widok trasy: lista punktów i odtwarzacz opowieści (pauza, przejście do następnego; „dalej” wg decyzji) — `R3` — 22:00
- [ ] **T-35** Wersja mobilna: 16 px marginesu, bez poziomego scrolla — `R3` — 22:00
- [ ] **T-36** Podstrona demo: stała lokalizacja, symulowana jazda ok. 1,5 min — `R3` — niedziela 08:00
- [ ] **T-60** Pierwszy deploy na Vercel — `R3` — 22:00

## R4 · AI i głos

- [ ] **T-45** Port `LlmProvider` z implementacjami `bielik`, `claude`, `fake` i `POST /v1/stories` z `story_cache` — `R4` — 17:00
- [ ] **T-41** Prompt Sawy: persona rówieśniczki, która mieszka w Warszawie rok, zasady „fakty ze źródłami, bez zmyślania” — `R4` — 20:00
- [ ] **T-42** Opowieść „z okna”: tekst o punkcie na trasie z faktów z Supabase; długość zależna od czasu do punktu — `R4` — 22:00

## R2 · Produkt, pitch i QA (dawna R5)

- [ ] **T-50** Scenariusz demo 1,5 min (ścieżka z [10-prd.md](10-prd.md)) i tekst pitcha 5 min — `R2` — 15:00
- [ ] **T-51** Zaktualizować pitch deck w [pitch/](pitch/) pod MVP — `R2` — 22:00
- [ ] **T-52** Test na telefonie co 2 h: wszystkie ścieżki z PRD, zgłoszenia w tym pliku (robią wszyscy na zmianę, R2 pilnuje) — `R2` — od 17:00
- [ ] **T-55** Nagranie wideo demo jako zapas — `R2` — 22:00
- [ ] **T-53** Opis zakresu użycia AI (z historii git, PR-ów i archiwum `ai-log.md`) i dokumentacja na oddanie (`README.md`, regulamin §4 ust. 4) — `R2` — niedziela 10:30
- [ ] **T-54** Checklista z [06-plan-dnia.md](06-plan-dnia.md): repo, deck, dokumentacja, nagranie — `R2` — niedziela 10:30

## Wszyscy · końcówka

- [ ] **T-61** Zamrożenie zmian w kodzie, tylko poprawki błędów — `Wszyscy` — niedziela 09:00

## Poza MVP (nie ruszamy bez decyzji zespołu w `stan.md`)

Zakres to tylko lista MVP z [10-prd.md](10-prd.md), zob. [12-plan-mvp.md](12-plan-mvp.md) §10.

- [ ] **T-05** Decyzja o toaletach (OSM czy rezygnacja) — `R1` — 14:00
- [x] **T-06** Decyzja o Google Places (klucz każdego czy tylko Wikipedia) — `R2` — 14:00 (Jasiek, 13:43: używamy danych Google pobranych 15–16.10, bez zapytań na żywo i bez klucza; warstwa `dzis` → `places.today_nearby`, `Place.todayNearby`)
- [ ] **T-12** Kalendarz wydarzeń i pogoda (zbiory z [03-dane.md](03-dane.md)) — `R1` — 17:00
- [ ] **T-14** Przewidywanie, co będzie za oknem za X s (pozycja + rozkład); przy korku dłuższa historia — `R1` — po 22:00
- [x] **T-23** ~~Cache Google Places w Supabase~~ niepotrzebne: nie odpytujemy Google na żywo (T-06) — `R2` — (Jasiek, 13:43)
- [ ] **T-34** Zakładka czatu z Sawą (UI, podpięcie do T-40) — `R3` — noc
- [ ] **T-40** `POST /v1/chat` (SSE) z LLM (Bielik lub zapasowy); klucz tylko na serwerze — `R4` — 17:00
- [ ] **T-43** TTS: wybór (ElevenLabs czy open source), test polskiego na 3 tekstach — `R4` — 15:00
- [ ] **T-44** Awatar Sawy wygenerowany od zera po 11:00 wg [awatar/](awatar/) — `R4` — 15:00

## Zrobione

- [x] **T-07** Zasady pracy i mózg zespołu — zrobione 17.10 ok. 11:30
