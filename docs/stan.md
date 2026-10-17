# Stan projektu

**Ostatnia aktualizacja:** 17.10.2026, ok. 12:05 (Szczepan, z agentem)

## Teraz

- Sobota 17.10, po 11:00: kod aplikacji wolno pisać.
- Zrobione: mózg zespołu (mapa w `README.md`, `todo.md`, `zespol.md`, karty ról w `role/`), zasady pracy w `CLAUDE.md`.
- Nowe: [11-zasady-pracy-i-kodu.md](11-zasady-pracy-i-kodu.md) (zasady kodu i współpracy) i [12-plan-mvp.md](12-plan-mvp.md) (stack, kontrakt API, harmonogram). Każdy czyta i zgłasza niezgodę z założeniami [Z] (T-64).
- Szkielet monorepo gotowy (T-04): `pnpm install && pnpm dev`. Plan MVP przycięty do listy MVP z PRD, dodatki w `todo.md` w sekcji „Poza MVP”.
- Najbliższe: wpisanie git user.name i ról do `zespol.md` (T-08), inicjalizacja repo aplikacji (T-04), zdjęcie decyzji o API Bielika i Supabase (T-01, T-02).

## Zablokowane

- Nic zgłoszonego. Dopisz tu blokadę od razu, z nazwiskiem osoby, która może ją odblokować.

## Otwarte decyzje

Każda ma właściciela (kto rozstrzyga). Po decyzji przenieś ją do właściwego dokumentu i usuń stąd.

| Pytanie | Kto rozstrzyga | Gdzie szukać kontekstu |
|---|---|---|
| Potwierdzenie stacku z planu MVP: Hono na Railway + monorepo pnpm, 4 role (R5 → R2) | zespół, 12:30 | [12-plan-mvp.md](12-plan-mvp.md) §2, §11 |
| Skąd kolejność przystanków linii (GTFS?) | R1, 13:30 | [12-plan-mvp.md](12-plan-mvp.md) §7, P1 |
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

- 17.10, 11:45: backend jako osobna usługa Hono (TypeScript) na Railway, monorepo pnpm, dokumenty po polsku, kod po angielsku, 4 role (R5 rozwiązana, zadania ma R2). Ustalone przez Szczepana, do potwierdzenia przez zespół. [12-plan-mvp.md](12-plan-mvp.md)

- 17.10: MVP to historia miejsc; podcast z okna w komunikacji; bez logowania; Supabase na koncie zespołu. [Podsumowanie](spotkania/2026-10-17-1100-mvp-sawy.md)
- 15.10: historia to punkt na mapie, format GeoJSON + Markdown, treść generuje LLM na żywo. [historia/README.md](historia/README.md)
