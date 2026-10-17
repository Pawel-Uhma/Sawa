# Todo zespołu

**Ostatnia aktualizacja:** 17.10.2026, ok. 11:30

**Źródło prawdy dla zadań.** Każdy agent i każda osoba czyta tę listę przed pracą i aktualizuje ją po pracy.

## Legenda

- `- [ ]` do zrobienia
- `- [~]` w toku: dopisz kto i od kiedy, np. `(Antek, od 12:10)`
- `- [x]` zrobione: dopisz godzinę, np. `(Janek, 13:05)`
- Tag roli na końcu linii (`R1`–`R5`, `Wszyscy`): kto odpowiada. Pełna lista ról w [zespol.md](zespol.md).
- Terminy to plan z [06-plan-dnia.md](06-plan-dnia.md). Zadanie po terminie oznacz w `stan.md` jako zablokowane.

## Start i wspólne (sobota 17.10)

- [ ] **T-08** Każdy wpisuje swój `git user.name` i rolę w [zespol.md](zespol.md), zanim zacznie pracę — `Wszyscy` — 11:45
- [ ] **T-03** Każdy ma token API dane.um.warszawa.pl w `.env.local` (nie w git); klucz jest na Discordzie zespołu — `Wszyscy` — 11:30
- [ ] **T-09** Konta: GitHub (repo), Vercel, dostęp do LLM — `Wszyscy` — 12:00
- [ ] **T-02** Projekt Supabase na koncie zespołu (nie prywatnym); kto zakłada, do potwierdzenia — `R2` — 13:00
- [ ] **T-04** Repo aplikacji wg [05-plan-architektury.md](05-plan-architektury.md): `create-next-app`, shadcn, mapbox-gl, pierwszy push — `R3` — 13:00
- [ ] **T-01** Sprawdzić API Bielika (gdzie, limity, szybkość); wybrać zapasowy LLM — `R4` — 13:00
- [ ] **T-05** Decyzja o toaletach (OSM czy rezygnacja) — `R1` — 14:00
- [ ] **T-62** Zasady pracy z repo: gałęzie, PR, kto merge'uje; zapisać w `CLAUDE.md` — `Wszyscy` — 13:00
- [x] **T-65** Mapa: Mapbox (styl i renderer), decyzja R3, 17.10 — `R3` — 13:00
- [ ] **T-06** Decyzja o Google Places (klucz każdego czy tylko Wikipedia) — `R2` — 14:00

## R1 · Dane i planer tras

- [ ] **T-10** Proxy `waw/[zasob]` w backendzie na Railway z cache w pamięci (TTL wg docs/05), jeden zbiór działa end to end — `R1` — 13:00
- [ ] **T-11** Pozycje pojazdów ZTM i odjazdy z przystanku (endpointy z [api/](api/)) — `R1` — 15:00
- [ ] **T-12** Kalendarz wydarzeń i pogoda (zbiory z [03-dane.md](03-dane.md)) — `R1` — 17:00
- [ ] **T-13** Planer: trasa z przesiadkami, czas 30 min – 4 h, lista punktów — `R1` — 22:00
- [ ] **T-14** Przewidywanie, co będzie za oknem za X s (pozycja + rozkład); przy korku dłuższa historia — `R1` — po 22:00

## R2 · Baza i historia

- [ ] **T-20** Schemat Supabase dla miejsc: punkt, opis, źródła, zdjęcia, licencja, wersja EN — `R2` — 13:00
- [ ] **T-21** Załadować [historia/sawa-historia.geojson](historia/sawa-historia.geojson) do Supabase skryptem (nie ręcznie) — `R2` — 15:00
- [ ] **T-22** Sprawdzić licencje zdjęć w [historia/zdjecia.json](historia/zdjecia.json), odfiltrować te bez licencji — `R2` — 17:00
- [ ] **T-23** Cache Google Places w Supabase (tylko jeśli T-06 = tak) — `R2` — 22:00

## R3 · Frontend i mapa

- [ ] **T-30** Mapa Mapbox z jednym zbiorem punktów, dane z T-10 — `R3` — 13:00
- [ ] **T-31** Onboarding: ekran startowy i wybór ok. 3 zainteresowań — `R3` — 17:00
- [ ] **T-32** Slider czasu (30 min – 4 h) i przycisk „generuj” — `R3` — 17:00
- [ ] **T-33** Widok trasy: lista punktów i odtwarzacz opowieści (pauza, przejście do następnego; „dalej” wg decyzji) — `R3` — 22:00
- [ ] **T-34** Zakładka czatu z Sawą (UI, podpięcie do T-40) — `R3` — noc
- [ ] **T-35** Wersja mobilna: 16 px marginesu, bez poziomego scrolla — `R3` — 22:00
- [ ] **T-36** Podstrona demo: stała lokalizacja, symulowana jazda ok. 1,5 min — `R3` — niedziela 08:00
- [ ] **T-60** Pierwszy deploy na Vercel — `R3` — 22:00

## R4 · AI i głos

- [ ] **T-40** Endpoint `chat` w backendzie na Railway z LLM (Bielik lub zapasowy); klucz tylko na serwerze — `R4` — 17:00
- [ ] **T-41** Prompt Sawy: persona rówieśniczki, która mieszka w Warszawie rok, zasady „fakty ze źródłami, bez zmyślania” — `R4` — 20:00
- [ ] **T-42** Opowieść „z okna”: tekst o punkcie na trasie z faktów z Supabase; długość zależna od czasu do punktu — `R4` — 22:00
- [ ] **T-43** TTS: wybór (ElevenLabs czy open source), test polskiego na 3 tekstach — `R4` — 15:00
- [ ] **T-44** Awatar Sawy wygenerowany od zera po 11:00 wg [awatar/](awatar/) — `R4` — 15:00

## R5 · Produkt, pitch i QA

- [ ] **T-50** Scenariusz demo 1,5 min (ścieżka z [10-prd.md](10-prd.md)) i tekst pitcha 5 min — `R5` — 15:00
- [ ] **T-51** Zaktualizować pitch deck w [pitch/](pitch/) pod MVP — `R5` — 22:00
- [ ] **T-52** Test na telefonie co 2 h: wszystkie ścieżki z PRD, zgłoszenia w tym pliku — `R5` — od 17:00
- [ ] **T-55** Nagranie wideo demo jako zapas — `R5` — 22:00
- [ ] **T-53** Dziennik AI i dokumentacja na oddanie (`ai-log.md`, `README.md`, regulamin §4 ust. 4) — `R5` — niedziela 10:30
- [ ] **T-54** Checklista z [06-plan-dnia.md](06-plan-dnia.md): repo, deck, dokumentacja, nagranie — `R5` — niedziela 10:30

## Wszyscy · końcówka

- [ ] **T-61** Zamrożenie zmian w kodzie, tylko poprawki błędów — `Wszyscy` — niedziela 09:00

## Zrobione

- [x] **T-63** Backend: Railway — decyzja 17.10, 11:40
- [x] **T-64** Domena: darmowa subdomena Vercela — decyzja 17.10, 11:40

- [x] **T-07** Zasady pracy i mózg zespołu — zrobione 17.10 ok. 11:30
