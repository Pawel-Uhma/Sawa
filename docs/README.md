# Warsaw Open Data Hackathon 2026: mózg zespołu Sawa

**Kiedy:** 17–18 października 2026, start pracy w sobotę o 11:00, koniec w niedzielę o 11:00
**Gdzie:** 42 Warsaw, al. Solidarności 171B
**Zespół:** 4 osoby, każda z własnym agentem Claude Code. Kto jest kim: [zespol.md](zespol.md)

## Jesteś agentem? Czytaj w tej kolejności

1. [stan.md](stan.md): co się dzieje teraz, co zablokowane, które decyzje są otwarte
2. [todo.md](todo.md): zadania z tagami ról (R1–R4)
3. [zespol.md](zespol.md): znajdź swój wiersz po `git config user.name`, to da Ci rolę
4. [role/](role/): karta Twojej roli (zakres, pliki, zasady, kto na kogo czeka)
5. Resztę dokumentów bierz wg potrzeby (tabela niżej)

Hook `.claude/hooks/session-start.sh` robi kroki 3–4 za Ciebie przy starcie sesji, o ile wpisano git user.name.

## Stan decyzji

| Decyzja | Status |
|---|---|
| Wyzwanie | **1. „Warszawa 2076”** (17.10): zanikająca tożsamość i przynależność do miasta |
| Pomysł | **Sawa**: planuje przejazd komunikacją miejską i opowiada o mijanych miejscach jak podcast. [PRD](10-prd.md), dane historyczne okolicy w [historia/](historia/README.md) |
| Baza | Supabase (konto zespołu, 17.10) |
| Stack | Monorepo pnpm: Next.js na Vercel, API Hono na Railway, Supabase. [12-plan-mvp.md](12-plan-mvp.md) |
| Zasady kodu | [11-zasady-pracy-i-kodu.md](11-zasady-pracy-i-kodu.md): git, obszary ról, warstwy, nazewnictwo, testy |
| Zespół | 4 osoby, role R1–R4 (R5 rozwiązana, zadania ma R2) |
| Kod przed wydarzeniem | **Nie piszemy** (regulamin §4 ust. 3). Od 17.10, 11:00 wolno |

## Mapa dokumentów

**Zarządzanie pracą (zaglądasz tu co godzinę)**

| Plik | Co jest w środku | Kto aktualizuje |
|---|---|---|
| [stan.md](stan.md) | Teraz, zablokowane, otwarte decyzje, ostatnie decyzje | każdy po istotnej zmianie |
| [todo.md](todo.md) | Zadania, statusy `[ ]` `[~]` `[x]`, tagi ról | każdy po zadaniu |
| [zespol.md](zespol.md) | Osoby, git user.name, role | każdy przy starcie |
| [role/](role/) | Karty ról R1–R5 | właściciel roli |
| [06-plan-dnia.md](06-plan-dnia.md) | Harmonogram sobota/niedziela, struktura pitcha, checklista | R5 |
| [spotkania/](spotkania/) | Podsumowania spotkań zespołu | skill `spotkanie` |
| [ai-log.md](ai-log.md) | Dziennik użycia AI (regulamin §4 ust. 4) | hook sam, plus linia `**AI:**` od agenta |

**Produkt**

| Plik | Co jest w środku |
|---|---|
| [10-prd.md](10-prd.md) | **PRD Sawy**, fundament aplikacji |
| [09-pytania-prd.md](09-pytania-prd.md) | Pytania do PRD z odpowiedziami |
| [04-pomysly.md](04-pomysly.md) | Pomysły na projekt, wybrany: Sawa |
| [07-brainstorm-problemy.md](07-brainstorm-problemy.md) | Problemy Warszawy za 50 lat |
| [08-badania-trendy.md](08-badania-trendy.md) | Badania o Warszawie 2020–2026 i trendy |
| [02-analiza-wyzwan.md](02-analiza-wyzwan.md) | Porównanie trzech wyzwań |
| [pitch/](pitch/) | Pitch deck i materiały wizualne |
| [awatar/](awatar/) | Szkice awatara Sawy (do dyskusji, nie elementy projektu) |

**Dane i historia**

| Plik | Co jest w środku |
|---|---|
| [03-dane.md](03-dane.md) | 19 zbiorów z dane.um.warszawa.pl, endpointy |
| [api/](api/) | Szczegóły endpointów i ręczne testy curl |
| [historia/](historia/README.md) | Historia okolicy 1 km: GeoJSON, ludzie, oś czasu, zdjęcia |

**Architektura i zasady**

| Plik | Co jest w środku |
|---|---|
| [12-plan-mvp.md](12-plan-mvp.md) | **Plan MVP:** stack, architektura, kontrakt API, model danych, planer, harmonogram z zadaniami ról, założenia, pytania |
| [13-plan-bazy.md](13-plan-bazy.md) | Plan bazy miejsc: analiza GeoJSON, schemat Supabase, RPC, seed, zainteresowania, licencje zdjęć |
| [11-zasady-pracy-i-kodu.md](11-zasady-pracy-i-kodu.md) | **Zasady:** git i PR, kto jest właścicielem czego, warstwy abstrakcji, nazewnictwo, testy, dobre praktyki, praca z agentami |
| [05-plan-architektury.md](05-plan-architektury.md) | Pierwszy plan architektury (częściowo nieaktualny, zob. 12), TTL cache |
| [01-regulamin.md](01-regulamin.md) | Zasady konkursu, punktacja, co oddajemy |

## Gdzie co zapisać

| Co się zmieniło | Gdzie |
|---|---|
| Zadanie do zrobienia, status, kto robi | [todo.md](todo.md) |
| Co teraz, co zablokowane, otwarta decyzja | [stan.md](stan.md) |
| Decyzja zespołu (pomysł, architektura, rola) | dokument, którego dotyczy, plus wpis w [spotkania/](spotkania/) |
| Fakt o API miasta | [api/](api/) i [03-dane.md](03-dane.md) |
| Zmiana roli albo podziału pracy | [zespol.md](zespol.md) i karta w [role/](role/) |
