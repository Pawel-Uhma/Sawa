# Warsaw Open Data Hackathon 2026

Repozytorium zespołu (4 osoby, każda z własnym agentem) na hackathon 17–18.10.2026 w 42 Warsaw. Dokumentacja jest w `docs/`, zacznij od `docs/README.md`.

**Zanim napiszesz kod, przeczytaj [`docs/11-zasady-pracy-i-kodu.md`](docs/11-zasady-pracy-i-kodu.md)** (git, obszary ról, warstwy, nazewnictwo, testy) i właściwą sekcję [`docs/12-plan-mvp.md`](docs/12-plan-mvp.md) (stack, kontrakt API, harmonogram).

## Praca zespołowa: jak agent się odnajduje

- **Start sesji:** hook `.claude/hooks/session-start.sh` podaje Ci rolę według `git config user.name` (wiersz w `docs/zespol.md`), kartę roli z `docs/role/` i otwarte zadania z `docs/todo.md`. Jeśli roli nie ma, zapytaj użytkownika, jaka jest jego rola, i zaproponuj wpis w `docs/zespol.md`.
- **Mapa:** `docs/README.md` mówi, gdzie co leży. `docs/stan.md` to teraz, zablokowane i otwarte decyzje. `docs/todo.md` to zadania.
- **Zadania:** pracujesz nad zadaniami swojej roli (tag `R1`–`R4`; dawna R5 należy do R2). Zanim zaczniesz, zmień `[ ]` na `[~]` i dopisz, kto i od kiedy. Po skończeniu zmień na `[x]` i dopisz godzinę. Zadanie z cudzej roli bierz tylko, gdy właściciel je oddał w `todo.md` albo użytkownik to zlecił. Wtedy zmień tag i zapisz to.
- **Aktualizacja mózgu:** po każdej istotnej zmianie uaktualnij `todo.md` (statusy), `stan.md` (1–3 linie: co zrobione, co zablokowane) i dokument tematyczny, jeśli zmieniła się wiedza. `todo.md` jest źródłem prawdy dla całego zespołu, więc nie zostawiaj go nieaktualnego.
- **Git:** `git pull` przed pracą, małe commity. Nie edytujesz plików innej roli bez zgody właściciela (karta roli mówi, czego nie ruszać). Pliki wspólne (`CLAUDE.md`, `docs/README.md`, `docs/stan.md`, `docs/todo.md`, `docs/zespol.md`) edytuj krótko i zawsze po `git pull`. Konflikt w `todo.md`: scal, nie kasuj cudzych linii.
- **Decyzje:** nie wymyślasz decyzji zespołu. Otwarte kwestie trafiają do `stan.md`, z tabelą „Otwarte decyzje” i wskazaniem, kto rozstrzyga.

## Zasady, których pilnujesz

- **Przed 17.10.2026, 11:00 nie piszesz kodu aplikacji.** Regulamin (§4 ust. 3) zabrania używania kodu i innych elementów przygotowanych przed wydarzeniem. Dozwolone są tylko gotowe biblioteki open source. Przed startem wolno: dokumentacja, analiza danych, plany, testowanie API ręcznie (curl), notatki. Jeśli ktoś prosi o kod przed startem, przypomnij o tej zasadzie i zaproponuj zapisanie planu w `docs/`.
- **Każde rozwiązanie musi korzystać z min. 1 zbioru z dane.um.warszawa.pl** (katalog: `docs/03-dane.md`).
- **Nigdy nie commituj tokenu API.** Token trzymamy w `.env.local`, a ten plik jest w `.gitignore`.

## Użycie AI

Dziennika promptów nie prowadzimy (decyzja z 17.10, ok. 13:30: hook generował konflikty w każdym PR). `docs/ai-log.md` to archiwum do 17.10, 13:30, nie dopisuj do niego. Regulamin (§4 ust. 4) wymaga opisu zakresu użycia AI w dokumentacji na oddanie: przygotowuje go R2 w T-53 z historii git, PR-ów i archiwum. Jeśli zmieniła się wiedza w dokumencie tematycznym (np. architektura), zaktualizuj ten dokument.

## Stack (od 17.10)

Monorepo pnpm: `apps/web` (Next.js App Router, Tailwind, shadcn/ui, MapLibre → Vercel), `apps/api` (Hono na Node → Railway), `packages/shared` (kontrakt zod), Supabase (Postgres + PostGIS, migracje w `supabase/migrations/`). Testy Vitest, lint Biome. Szczegóły w `docs/12-plan-mvp.md`.

Przed PR: `pnpm typecheck && pnpm lint && pnpm test`. Nie commitujesz ani nie pushujesz bez polecenia człowieka.

## Frontend

Frontend (R3 i każdy UI) projektujemy inspirowany skillem `apple-design`: płynny, fizyczny ruch, przerywalne przejścia, czytelna typografia i restraint, z uwzględnieniem reduced motion.

## Styl

Dokumentację piszesz po polsku, zwięźle. Commity bez przypisywania autorstwa Claude.
