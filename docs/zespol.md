# Zespół i role

Każdy agent (Claude Code na laptopie) sam rozpoznaje, kim jest: hook `.claude/hooks/session-start.sh` bierze `git config user.name` i szuka wiersza w tabeli poniżej. **Wpisz swoją nazwę git, zanim zaczniesz pracę.** Sprawdź ją poleceniem `git config user.name`.

## Osoby

| Osoba | Git user.name | Rola |
|---|---|---|
| Paweł | Pawel | R3 (ekrany, `/demo`), opowieści i głos (zakres R4), deck i film do pitchu |
| Antek | antpop | R3 (mapa: `features/map`), ciemny motyw, proxy API miasta |
| Szczepan | Szczpan | R1 (planer tras), szkielet monorepo i CI |
| Janek (Jasiek) | Jasiek | R2 (baza miejsc, API miejsc, oddanie) |

Kolumna „Rola” to kod roli: `R1`, `R2`, `R3` albo `R4`. Zespół ma 4 osoby, więc R5 jest rozwiązana, a jej zadania przejmuje R2 ([12-plan-mvp.md](12-plan-mvp.md) §11). Jedna osoba może mieć jedną rolę główną. Podział to propozycja z [06-plan-dnia.md](06-plan-dnia.md), zespół może ją zmienić na spotkaniu (zmieniaj wtedy tę tabelę i karty w `role/`).

## Kto za co odpowiadał (z historii git)

Podsumowanie z commitów w `main` do 17.10, 22:15. R4 nie miała osobnej osoby: opowieści i głos zrobił Paweł, prompty poprawiał też Janek. Janek commitował też jako „Jan Wojciechowski”, Szczepan i Paweł także z kont GitHuba (merge w przeglądarce).

**Paweł (R3 ekrany, R4 opowieści i głos):**
- Przed startem: dokumentacja zespołu (regulamin, dane, pomysły, plan, pitch, awatar Sawy) i research historii okolicy 42 Warsaw (326 punktów z Wikipedii, OSM i Google Places).
- 17.10 rano: role i hook startowy agentów, mapa dokumentów, decyzje o stacku, makiety ekranu głównego, deploy web na Vercel i api na Railway.
- Ekrany `/demo`: onboarding, arkusz i karta trasy, karty miejsca, wybór pieszo albo komunikacją, koniec trasy, wyszukiwanie celu (Google Places), menu Sawy i profil, PWA, stany czekania (T-131), i18n, tryb sceny, tryb dla dzieci (T-123).
- Opowieści i głos: OpenRouter, ElevenLabs, opowieści jak podcast z głosem strumieniem, lata słownie w TTS.
- Mapa: ikony pojazdów (T-100), 35 znaczników podrodzaju (`places.subkind`, T-126), kolory grup i legenda, klastry, podświetlanie ulicy.
- Dane historyczne kolejnych rund: Warszawikia, Commons, Wirtualny Sztetl, surowe dane dzielnic.
- Pitch: plan pod „Warszawa 2076”, deck v1–v3, wideo otwarcia i nagranie demo (Remotion, `tools/pitch-video/`), sekcja AI w README.

**Antek (R3 mapa):**
- Mapa MapLibre w `features/map`: kamera i padding, kropka użytkownika, aktywny przystanek, miejsca z kafelków widoku, karta miejsca, klastry (T-118), granice Warszawy, czytelniejsze ulice; playground pod `/mapa/playground`; plan mapy ([14-plan-mapy.md](14-plan-mapy.md)).
- Ciemny motyw w całej aplikacji (tokeny, przełącznik jasny/ciemny/auto).
- GPS przesuwa zegar jazdy przy punktach trasy.
- Infrastruktura: dev container, proxy do dane.um.warszawa.pl na home labie (#63), poprawka hooka startowego.

**Szczepan (R1):**
- Szkielet monorepo: pnpm, Biome, Vitest, CI, Hono z `/health`, Next.js z typowanym klientem, pakiet `shared` z zod; zasady pracy i plan MVP; instrukcja instalacji w README.
- Planer tras: graf z GTFS, beam search z dopasowaniem miejsc, kontrakt trasy, `/debug/planner`, pętle, najszybsza trasa do celu (T-101), trasy piesze od 5 min, odjazdy z rozkładu ZTM, opóźnienia na żywo, kara za powrót tą samą drogą, Valhalla jako zapasowy router.
- Cztery kategorie zainteresowań w kontrakcie, Dockerfile i konfiguracja Railway.
- Web: start z prawdziwej lokalizacji, suwak z najszybszą drogą do celu, sterowanie opowieścią, przystanki wsiadania na mapie, pauza zegara jazdy.

**Janek (R2, dawna R5):**
- Baza: MCP Supabase, schemat miejsc z PostGIS i RPC, seed historii, plan bazy ([13-plan-bazy.md](13-plan-bazy.md)).
- API miejsc: kontrakt `Place`, port `PlacesRepository`, `GET /v1/places`, cache zapytań do Supabase pod demo.
- Miejsca na całą Warszawę (1092): parki i sport z OSM, zbiór miasta „Otwarte boiska”, zabytki i kultura z OSM i Wikipedii (T-73).
- Pojazdy na żywo z prognozą ruchu (T-99), API miasta przez proxy po stronie api (#63), trasy piesze po ulicach z OSRM (T-106), długość opowieści z czasu jazdy (T-119), limit zapytań o opowieści, prompty opisów, przyspieszenie `computePlaceHits` (3 s → 0,16 s).
- Web: podgląd pierwszego miejsca przed opowieścią, szczypanie mapy na telefonie, karta miejsca na trasie.
- README pod jury (T-53).

## Role

| Kod | Rola | Karta | Zakres |
|---|---|---|---|
| R1 | Dane i planer tras | [role/R1-dane-i-planer.md](role/R1-dane-i-planer.md) | Adaptery API miasta i rozkładu, cache, pozycje ZTM, planer trasy z przesiadkami, deploy API na Railway |
| R2 | Baza, historia i produkt | [role/R2-baza-i-historia.md](role/R2-baza-i-historia.md) | Supabase, seed historii, licencje zdjęć; od 17.10 także PRD, scenariusz demo, pitch, oddanie (dawna R5) |
| R3 | Frontend i mapa | [role/R3-frontend-i-mapa.md](role/R3-frontend-i-mapa.md) | Monorepo i CI, UI, onboarding, mapa MapLibre, slider czasu, odtwarzacz, `/demo`, deploy web na Vercel |
| R4 | AI i głos | [role/R4-ai-i-glos.md](role/R4-ai-i-glos.md) | LLM (Bielik, zapas Claude), prompty Sawy, opowieści, czat, TTS, awatar |
| ~~R5~~ | ~~Produkt, pitch i QA~~ | [role/R5-produkt-pitch-qa.md](role/R5-produkt-pitch-qa.md) | Rozwiązana 17.10, zadania przejmuje R2; testy na telefonie wszyscy |

## Pliki wspólne

Nikt nie zmienia ich po cichu. Edytuj krótko, zrób `git pull` przed i po:
`CLAUDE.md`, `docs/README.md`, `docs/stan.md`, `docs/todo.md`, `docs/zespol.md`.
