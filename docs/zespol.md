# Zespół i role

Każdy agent (Claude Code na laptopie) sam rozpoznaje, kim jest: hook `.claude/hooks/session-start.sh` bierze `git config user.name` i szuka wiersza w tabeli poniżej. **Wpisz swoją nazwę git, zanim zaczniesz pracę.** Sprawdź ją poleceniem `git config user.name`.

## Osoby

| Osoba | Git user.name | Rola |
|---|---|---|
| Paweł | Pawel | R3 |
| Antek | _wpisać_ | _do ustalenia_ |
| Szczepan | _wpisać_ | _do ustalenia_ |
| Janek | _wpisać_ | _do ustalenia_ |
| _piąta osoba_ | _wpisać_ | _do ustalenia_ |

Kolumna „Rola” to kod roli: `R1`, `R2`, `R3`, `R4` albo `R5`. Jedna osoba może mieć jedną rolę główną. Podział to propozycja z [06-plan-dnia.md](06-plan-dnia.md), zespół może ją zmienić na spotkaniu (zmieniaj wtedy tę tabelę i karty w `role/`).

## Role

| Kod | Rola | Karta | Zakres |
|---|---|---|---|
| R1 | Dane i planer tras | [role/R1-dane-i-planer.md](role/R1-dane-i-planer.md) | Proxy do API miasta, cache, pozycje ZTM, planer trasy z przesiadkami |
| R2 | Baza i historia | [role/R2-baza-i-historia.md](role/R2-baza-i-historia.md) | Supabase, seed historii z GeoJSON, licencje zdjęć, cache Google Places |
| R3 | Frontend i mapa | [role/R3-frontend-i-mapa.md](role/R3-frontend-i-mapa.md) | UI, onboarding, mapa Mapbox, slider czasu, odtwarzacz opowieści, wersja mobilna |
| R4 | AI i głos | [role/R4-ai-i-glos.md](role/R4-ai-i-glos.md) | LLM (Bielik, zapas Claude), prompty Sawy, czat, TTS, awatar |
| R5 | Produkt, pitch i QA | [role/R5-produkt-pitch-qa.md](role/R5-produkt-pitch-qa.md) | PRD, scenariusz demo, pitch deck, testy na telefonie, dziennik AI, oddanie |

## Pliki wspólne

Nikt nie zmienia ich po cichu. Edytuj krótko, zrób `git pull` przed i po:
`CLAUDE.md`, `docs/README.md`, `docs/stan.md`, `docs/todo.md`, `docs/zespol.md`, `docs/ai-log.md` (dopisujesz tylko na końcu).
