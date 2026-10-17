# Stan projektu

**Ostatnia aktualizacja:** 17.10.2026, ok. 11:30 (Paweł, z agentem)

## Teraz

- Sobota 17.10, po 11:00: kod aplikacji wolno pisać.
- Zrobione: mózg zespołu (mapa w `README.md`, `todo.md`, `zespol.md`, karty ról w `role/`), zasady pracy w `CLAUDE.md`.
- Najbliższe: wpisanie git user.name i ról do `zespol.md` (T-08), inicjalizacja repo aplikacji (T-04), zdjęcie decyzji o API Bielika i Supabase (T-01, T-02).

## Zablokowane

- Nic zgłoszonego. Dopisz tu blokadę od razu, z nazwiskiem osoby, która może ją odblokować.

## Otwarte decyzje

Każda ma właściciela (kto rozstrzyga). Po decyzji przenieś ją do właściwego dokumentu i usuń stąd.

| Pytanie | Kto rozstrzyga | Gdzie szukać kontekstu |
|---|---|---|
| Przycisk „dalej” w opowieści: MVP czy później | zespół | [spotkania/2026-10-17-1100-mvp-sawy.md](spotkania/2026-10-17-1100-mvp-sawy.md) |
| Głos: ElevenLabs czy open source, jakość polskiego | R4 + zespół | [05-plan-architektury.md](05-plan-architektury.md) |
| Toalety: brak zbioru w portalu, OSM czy rezygnacja | R1 | [spotkania/2026-10-17-1100-mvp-sawy.md](spotkania/2026-10-17-1100-mvp-sawy.md) |
| Tryb „z wysiadaniem” (muzea): MVP czy po MVP | zespół | [10-prd.md](10-prd.md) |
| Scraping muzeów i wystaw pod zainteresowania | zespół | [spotkania/2026-10-17-1100-mvp-sawy.md](spotkania/2026-10-17-1100-mvp-sawy.md) |
| Google Places: klucz każdego czy tylko Wikipedia | R2 + zespół | [05-plan-architektury.md](05-plan-architektury.md) |
| API Bielika: gdzie hostowane, limity; zapasowy LLM | R4 | [05-plan-architektury.md](05-plan-architektury.md) |
| Rozpoznawanie powracającego użytkownika bez konta | zespół (dodatek, jeśli zostanie czas) | [spotkania/2026-10-17-1100-mvp-sawy.md](spotkania/2026-10-17-1100-mvp-sawy.md) |
| Zasady pracy z repo (gałęzie, PR, merge) | zespół | [spotkania/2026-10-17-1130-stack-repo-domena.md](spotkania/2026-10-17-1130-stack-repo-domena.md) |
| Zdanie o wdrożeniu dla jury (Sawa obok Warszawa 19115) | R5 | [06-plan-dnia.md](06-plan-dnia.md) |

## Ostatnie decyzje

- 17.10: backend na Railway; zostajemy przy darmowej subdomenie Vercela. [05-plan-architektury.md](05-plan-architektury.md)
- 17.10: mapa na Mapbox (styl własny; R3). Renderer nadal MapLibre. Token trzymamy poza repo. [05-plan-architektury.md](05-plan-architektury.md)

- 17.10, 11:30: stack Next.js + Supabase + Vercel potwierdzony; repo z dokumentacją i klucz API na Discordzie zespołu. [Podsumowanie](spotkania/2026-10-17-1130-stack-repo-domena.md)

- 17.10: MVP to historia miejsc; podcast z okna w komunikacji; bez logowania; Supabase na koncie zespołu. [Podsumowanie](spotkania/2026-10-17-1100-mvp-sawy.md)
- 17.10: historia to punkt na mapie, format GeoJSON + Markdown, treść generuje LLM na żywo. [historia/README.md](historia/README.md)
