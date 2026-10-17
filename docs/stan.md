# Stan projektu

**Ostatnia aktualizacja:** 17.10.2026, ok. 12:05 (Szczepan, z agentem)

## Teraz

- R1 (Szczepan, ok. 14:30): planer jest w `main` (PR #5). Wybór zainteresowań zmieniony na 4 ogólne kategorie: `historical`, `cultural`, `sports`, `nature` (PR w toku). **R3:** onboarding pokazuje te 4 (etykiety PL: historia, kultura, sport, przyroda). **R2:** oznaczyć miejsca kategoriami (T-25, instrukcja w karcie R2): szczegółowe tagi zostają, można też wpisać nazwę kategorii wprost; do `sports` i `nature` potrzebne nowe miejsca (otwarte boiska z API miasta, parki z OSM). Dziś: historia 241 miejsc, kultura 207, sport 0, przyroda 0.

- Sobota 17.10, po 11:00: kod aplikacji wolno pisać.
- Zrobione: mózg zespołu (mapa w `README.md`, `todo.md`, `zespol.md`, karty ról w `role/`), zasady pracy w `CLAUDE.md`.
- Nowe: [11-zasady-pracy-i-kodu.md](11-zasady-pracy-i-kodu.md) (zasady kodu i współpracy) i [12-plan-mvp.md](12-plan-mvp.md) (stack, kontrakt API, harmonogram). Każdy czyta i zgłasza niezgodę z założeniami [Z] (T-64).
- Szkielet monorepo gotowy (T-04): `pnpm install && pnpm dev`. Plan MVP przycięty do listy MVP z PRD, dodatki w `todo.md` w sekcji „Poza MVP”.
- Najbliższe: wpisanie git user.name i ról do `zespol.md` (T-08), inicjalizacja repo aplikacji (T-04), zdjęcie decyzji o API Bielika i Supabase (T-01, T-02).
- Plan bazy miejsc w [13-plan-bazy.md](13-plan-bazy.md) (Jasiek, 13:00): baza Supabase pusta, PostGIS do włączenia; 13:10: schemat i RPC w Supabase (T-20), 13:08: dane załadowane (326 miejsc, 351 zdjęć, T-21). R3 i R4 mogą czytać przez RPC `places_in_bbox`, `place_detail`, R1 przez `places_near_line` (Jasiek). 13:24: port `PlacesRepository` i adapter w `apps/api/src/adapters/supabase/` (T-24); następne: kontrakt `Place`/`PlaceSummary` i `/v1/places`.

- R1 (Szczepan, 13:15): kolejność przystanków i kształty linii z GTFS mkuran.pl (licencja ZTM + ODbL, wymagany podpis), skompresowane do `apps/api/data/`. Planer dopasowuje miejsca do tras **w pamięci API**, wejście to GeoJSON w formacie RPC `places_in_bbox` (teraz z pliku `apps/api/data/places.geojson`, potem z Supabase). **Dla R2 (Jasiek):** RPC `places_near_line` nie będzie używane przez planer; lista `INTERESTS` przenosi się do `packages/shared/src/interests.ts` (te same klucze), `scripts/historia/interests.ts` może ją stamtąd importować; dodaję `scripts/export-places-geojson.ts`, które używa Twojego `mapPlace`.

- R1 (Szczepan, 14:00): planer działa na prawdziwych danych (GTFS + 326 miejsc z pliku), `POST /v1/routes/plan` i `GET /v1/routes/demo` w PR #4, podgląd na `http://localhost:8787/debug/planner` (`DEBUG_PAGES=1`). `Route.places` to już miejsca do opowieści, co najmniej 45 s od siebie (dla R4). Po ok. 20 min trasa wychodzi poza obszar z danymi.

## Zablokowane

- Nic zgłoszonego. Dopisz tu blokadę od razu, z nazwiskiem osoby, która może ją odblokować.

## Otwarte decyzje

Każda ma właściciela (kto rozstrzyga). Po decyzji przenieś ją do właściwego dokumentu i usuń stąd.

| Pytanie | Kto rozstrzyga | Gdzie szukać kontekstu |
|---|---|---|
| Lista zainteresowań (8 kluczy) i reguły przypisania w seedzie | R3 + R2 | [13-plan-bazy.md §5](13-plan-bazy.md) |
| Potwierdzenie stacku z planu MVP: Hono na Railway + monorepo pnpm, 4 role (R5 → R2) | zespół, 12:30 | [12-plan-mvp.md](12-plan-mvp.md) §2, §11 |
| Konta Vercel i Railway: zespołowe czy prywatne | zespół, 12:30 | [12-plan-mvp.md](12-plan-mvp.md) P7 |
| Przycisk „dalej” w opowieści: MVP czy później | zespół | [spotkania/2026-10-17-1100-mvp-sawy.md](spotkania/2026-10-17-1100-mvp-sawy.md) |
| Głos: ElevenLabs czy open source, jakość polskiego | R4 + zespół | [05-plan-architektury.md](05-plan-architektury.md) |
| Toalety: brak zbioru w portalu, OSM czy rezygnacja | R1 | [spotkania/2026-10-17-1100-mvp-sawy.md](spotkania/2026-10-17-1100-mvp-sawy.md) |
| Tryb „z wysiadaniem” (muzea): MVP czy po MVP | zespół | [10-prd.md](10-prd.md) |
| Scraping muzeów i wystaw pod zainteresowania | zespół | [spotkania/2026-10-17-1100-mvp-sawy.md](spotkania/2026-10-17-1100-mvp-sawy.md) |
| Google Places: klucz każdego czy tylko Wikipedia | R2 + zespół | [05-plan-architektury.md](05-plan-architektury.md) |
| API Bielika: gdzie hostowane, limity; zapasowy LLM | R4 | [05-plan-architektury.md](05-plan-architektury.md) |
| Rozpoznawanie powracającego użytkownika bez konta | zespół (dodatek, jeśli zostanie czas) | [spotkania/2026-10-17-1100-mvp-sawy.md](spotkania/2026-10-17-1100-mvp-sawy.md) |
| Zdanie o wdrożeniu dla jury (Sawa obok Warszawa 19115) | R5 | [06-plan-dnia.md](06-plan-dnia.md) |

## Ostatnie decyzje

- 17.10, 13:31: bez dziennika AI. Hook `log-prompt.sh` usunięty, reguła `**AI:**` z `CLAUDE.md` wycofana, `ai-log.md` zostaje jako archiwum. Opis użycia AI na oddanie robi R2 (T-53). Zdecydował Jasiek (R2, właściciel T-53).
- 17.10, 11:45: backend jako osobna usługa Hono (TypeScript) na Railway, monorepo pnpm, dokumenty po polsku, kod po angielsku, 4 role (R5 rozwiązana, zadania ma R2). Ustalone przez Szczepana, do potwierdzenia przez zespół. [12-plan-mvp.md](12-plan-mvp.md)

- 17.10: MVP to historia miejsc; podcast z okna w komunikacji; bez logowania; Supabase na koncie zespołu. [Podsumowanie](spotkania/2026-10-17-1100-mvp-sawy.md)
- 15.10: historia to punkt na mapie, format GeoJSON + Markdown, treść generuje LLM na żywo. [historia/README.md](historia/README.md)
