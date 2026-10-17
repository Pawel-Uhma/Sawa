# Zespół i role

Każdy agent (Claude Code na laptopie) sam rozpoznaje, kim jest: hook `.claude/hooks/session-start.sh` bierze `git config user.name` i szuka wiersza w tabeli poniżej. **Wpisz swoją nazwę git, zanim zaczniesz pracę.** Sprawdź ją poleceniem `git config user.name`.

## Osoby

| Osoba | Git user.name | Rola |
|---|---|---|
| Paweł | Pawel | _do ustalenia_ |
| Antek | antpop | R3 |
| Szczepan | Szczpan | R1 |
| Janek (Jasiek) | Jasiek | R2 |

Kolumna „Rola” to kod roli: `R1`, `R2`, `R3` albo `R4`. Zespół ma 4 osoby, więc R5 jest rozwiązana, a jej zadania przejmuje R2 ([12-plan-mvp.md](12-plan-mvp.md) §11). Jedna osoba może mieć jedną rolę główną. Podział to propozycja z [06-plan-dnia.md](06-plan-dnia.md), zespół może ją zmienić na spotkaniu (zmieniaj wtedy tę tabelę i karty w `role/`).

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
