# Plan wdrożenia MVP Sawy

Wersja 2, 17.10.2026, ok. 12:00. **Plan obejmuje tylko listę „MVP” z [10-prd.md](10-prd.md).** Wszystko z sekcji „Po MVP” w PRD i inne dodatki są poza planem (§10). Źródła: [10-prd.md](10-prd.md), [03-dane.md](03-dane.md), [historia/](historia/README.md), [spotkanie z 11:00](spotkania/2026-10-17-1100-mvp-sawy.md). Zasady pisania kodu: [11-zasady-pracy-i-kodu.md](11-zasady-pracy-i-kodu.md).

**[Z]** oznacza założenie, którego zespół jeszcze nie potwierdził. Lista założeń: §11. Pytania bez odpowiedzi: §12.

## 1. Zakres i definicja „gotowe”

Lista MVP z PRD, jeden do jednego:

| # | Punkt MVP z PRD | Gdzie w planie |
|---|---|---|
| M1 | Ekran startowy z przewodnikiem | §9, R3 |
| M2 | Onboarding zainteresowań (ok. 3, podobne pojawiają się po wyborze) | §9, R3 |
| M3 | Mapa i slider czasu (30 min – 4 h) | §9, R3 |
| M4 | Planowanie trasy komunikacją miejską (z przesiadkami, bez wysiadania, lista punktów) | §7, R1 |
| M5 | Opowieść o miejscach na trasie (dane o miejscach + ZTM) | §6, §8, R2 + R4 |
| M6 | Podstrona demo: stała lokalizacja, symulowana jazda, wszystko w ok. 1,5 min | §8, R3 |
| M7 | Wejście przez kod QR, strona wygląda jak aplikacja na telefonie | §9, R3 |
| — | Bez logowania | wszędzie |

Punkt jest **gotowy**, gdy działa na produkcji (Vercel + Railway), przechodzi ścieżkę na telefonie (szerokość 375 px) i ma testy logiki z `domain/`. `/demo` musi przejść scenariusz także wtedy, gdy API miasta albo LLM nie odpowiada (§8), bo bez tego nie ma pitcha.

Zbiory z dane.um.warszawa.pl w MVP: przystanki, linie na przystanku, odjazdy linii z przystanku (ZTM).

## 2. Stack

| Warstwa | Wybór | Dlaczego |
|---|---|---|
| Monorepo | **pnpm workspaces** | 3 pakiety, bez dodatkowych narzędzi |
| Runtime | Node 24 LTS, TypeScript `strict` | Wspólny język dla 4 osób |
| Frontend | **Next.js (App Router)**, Tailwind, shadcn/ui | Ustalone wcześniej |
| Mapa | MapLibre GL przez `react-map-gl/maplibre`, podkład OSM (np. OpenFreeMap) **[Z]** | Bez klucza API |
| Stan w web | URL (zainteresowania, czas), TanStack Query (dane z API), Zustand (odtwarzacz) **[Z]** | Powtarzalny link do demo |
| Backend | **Hono na Node**, `@hono/zod-validator`, klient `hc` w web | Typy kontraktu przechodzą do web bez generowania kodu |
| Kontrakt | **zod** w `packages/shared` | Jedno źródło prawdy dla API i web |
| Baza | **Supabase** (Postgres + PostGIS), projekt `arvrzfqtqlrasftvvkaq` | Ustalone 17.10; PostGIS do „miejsca przy trasie” |
| LLM | Port `LlmProvider`: teraz OpenRouter z `google/gemini-3.5-flash-lite` (tani, szybki; model zmienia `OPENROUTER_MODEL`), Bielik do dodania; bez klucza opowieść z faktów miejsca | Bielik to plus u jury |
| Lint, testy, CI | Biome, Vitest, GitHub Actions | Szybkie, jedna konfiguracja |
| Hosting | Vercel (web), **Railway** (api), Supabase; regiony UE **[Z]** | |

## 3. Architektura

```
telefon (Next.js na Vercel)
   │  tylko HTTPS do API (NEXT_PUBLIC_API_URL)
   ▼
apps/api (Hono na Railway)
   ├── adapters/waw ──────► dane.um.warszawa.pl: przystanki, linie, odjazdy (token, cache w pamięci)
   ├── adapters/gtfs ─────► kolejność przystanków i kształty linii, w pamięci [Z]
   ├── adapters/supabase ─► places, place_photos, story_cache
   └── adapters/llm ──────► Bielik / Claude / fake
```

Osobny backend na Railway, bo graf linii trzymamy w pamięci procesu, odpowiedź LLM może trwać dłużej niż limit funkcji serverless, a sekrety (token miasta, klucz LLM, `service_role` Supabase) są w jednym miejscu. Przeglądarka nie łączy się z Supabase ani z API miasta.

## 4. Struktura repo

```
Sawa/
  apps/web/            # Next.js → Vercel
  apps/api/            # Hono → Railway; src/{routes,services,domain,adapters,prompts,lib}/
  packages/shared/     # zod: kontrakt API, stałe, funkcje geo
  supabase/migrations/ # SQL
  scripts/             # seed-historia.ts, prewarm-stories.ts
  docs/
```

Warstwy i zależności: [11-zasady-pracy-i-kodu.md §4](11-zasady-pracy-i-kodu.md#4-warstwy-abstrakcji).

## 5. Kontrakt API (wersja 0, do zatwierdzenia o 13:30)

| Metoda i ścieżka | Wejście | Wyjście | MVP | Właściciel |
|---|---|---|---|---|
| `GET /health` | — | `{ ok, version }` | — | wspólne |
| `GET /v1/places` | `bbox`, `interests?` | GeoJSON z `PlaceSummary` | M3 | R2 |
| `GET /v1/places/:id` | — | `Place` (fakty, źródła, zdjęcia) | M5 | R2 |
| `POST /v1/routes/plan` | `{ origin: {lat,lng}, durationMin, interests[] }` | `Route` | M4 | R1 |
| `GET /v1/routes/demo` | — | stała `Route` | M6 | R1 |
| `POST /v1/stories` | `{ placeId, interests[], targetSec }` | `Story { text, sources[], cached }` | M5 | R4 |
| `POST /v1/stories/audio` | jak wyżej | `audio/mpeg`: ta sama opowieść głosem Sawy (ElevenLabs) | M5 | R4 |

```ts
type LatLng = { lat: number; lng: number };
type Interest = "historical" | "cultural" | "sports" | "nature"; // wybór użytkownika; miejsca mają drobniejsze tagi, mapowanie INTEREST_TAGS w packages/shared
type Leg = { line: string; mode: "tram" | "bus"; fromStopId: string; toStopId: string; departAt: string; durationMin: number; lngLats: [number, number][] };
type RoutePlace = { placeId: string; name: string; position: LatLng; etaSec: number; windowSec: number };
type Route = { id: string; legs: Leg[]; places: RoutePlace[]; totalMin: number };
```

`etaSec`: czas od startu jazdy, po którym miejsce jest za oknem. `windowSec`: czas do następnego miejsca, z niego wynika długość opowieści.

**Mock najpierw:** do 14:30 `POST /v1/routes/plan` zwraca fixture zgodną z kontraktem, żeby R3 i R4 nie czekali na planer.

## 6. Model danych (Supabase)

```sql
places        (id text pk, name text, kind text, geom geography(Point,4326),
               address_today text, period text, facts jsonb, trivia jsonb, people jsonb,
               sources jsonb, interests text[], updated_at timestamptz)
place_photos  (id bigserial pk, place_id text fk, url text, caption text, year text,
               source text, license text, author text)          -- tylko z licencją
story_cache   (key text pk, place_id text fk, text text, sources jsonb, model text, created_at timestamptz)
```

- Indeks GIST na `places.geom`. RPC `places_in_bbox` daje GeoJSON miejsc w prostokącie: z tego korzysta mapa (R3) i planer (R1). RPC `places_near_line` jest w bazie, ale planer go nie używa (dopasowanie w pamięci, §7).
- Dane: [historia/sawa-historia.geojson](historia/sawa-historia.geojson) (326 punktów w promieniu 1 km od 42 Warsaw). Trasy MVP planujemy w tym obszarze **[Z]**.
- `interests` przypisuje skrypt seed (reguły po `typ` i słowach kluczowych).
- Klucz `story_cache` = `placeId + posortowane interests + przedział długości`.

## 7. Planer trasy (R1, M4), zbudowany 17.10

Celem jest **przejażdżka obok ciekawych miejsc w zadanym czasie**, bez wysiadania poza przesiadkami. Kod: `apps/api/src/domain/routing/` (czyste funkcje z testami), `services/plan-route.ts`, podgląd na `/debug/planner` (`DEBUG_PAGES=1`).

**Dane:**
- Sieć: GTFS Warszawy z [mkuran.pl/gtfs](https://mkuran.pl/gtfs/) (licencja ZTM + ODbL dla kształtów, podpis w `Route.attribution`). Skrypt `pnpm --filter @sawa/scripts transit` buduje `apps/api/data/transit-graph.json.gz` (ok. 0,4 MB: 575 wariantów tras tramwajów i autobusów z ruchem w dzień, 6384 przystanki, mediana czasów przejazdu, częstotliwość 10–20). Metro i kolej pominięte, bo pod ziemią nic nie widać. Plik jest na jeden dzień (domyślnie dziś); przed niedzielnym demo przebudować z `--date 2026-10-18`.
- Miejsca: z Supabase przez `PlacesRepository.listInBBox` (RPC `places_in_bbox`: `id, name, kind, interests, richness`), bbox wokół startu. Cache w pamięci per bbox na 10 min, po wygaśnięciu odświeżany w tle; trafienia na wariantach liczone od nowa tylko, gdy zmienił się zbiór miejsc. Bez kluczy Supabase albo przy błędzie (timeout 5 s) planer bierze `apps/api/data/places.geojson` (ten sam format, `pnpm --filter @sawa/scripts export:places`) i loguje to; Supabase próbuje znów po 1 min.
- Odjazdy na żywo: `get_ztm_odjazdy_linii_z_przystanku` dla każdego odcinka (wymaga `WAW_TOKEN`, cache 1 h, zapytania równolegle). Odcinek startuje pierwszym odjazdem po dojściu do przystanku (pierwszy) albo po wysiadce + 120 s (przesiadka), dalsze odcinki przesuwają się razem z nim (`apply-departures.ts`). Taki odcinek ma `Leg.realDeparture: true`; bez tokenu albo danych czekanie = połowa częstotliwości i pola nie ma.

**Algorytm:**
1. Miejsca w zasięgu (bbox wokół startu) dopasowane do każdego wariantu trasy: do 150 m od linii, z czasem od pierwszego przystanku (`place-hits.ts`). Liczone w pamięci, bez PostGIS.
2. Wartość miejsca: `waga(richness) × (1 + 1,5 × pasujące zainteresowania) × (1 − odległość/300 m)`, każde miejsce liczy się raz.
3. Beam search (szerokość 8, maks. 2 per wariant): start z przystanków do 500 m (dojście 1,2 m/s), czekanie połowa częstotliwości, przesiadka +120 s w obrębie zespołu przystanków, maks. 2 przesiadki, czas trasy 90–110% budżetu.
4. Z trasy wybierane są miejsca do opowieści: najlepsze punktowo, co najmniej 45 s od siebie (`select-stories.ts`). `windowSec` = czas do następnego miejsca.
5. Wynik: `Route` z kontraktu (`packages/shared/src/schemas/route.ts`), ok. 0,2 s na zapytanie.
6. **Pętla** (`returnToStart: true` w zapytaniu): trasa kończy się na przystanku do 500 m od startu. Do 3 przesiadek, można wrócić tą samą linią w drugą stronę, czas 80–110% budżetu. Czas powrotu z każdego zespołu przystanków liczy odwrócony Dijkstra (`return-times.ts`), więc wyszukiwanie od razu odrzuca trasy, z których nie da się zdążyć wrócić. Odpowiedź ma `endsAtStart` (false, gdy pętli nie udało się znaleźć). Ok. 0,3 s.
7. **Cel** (`destination: {lat, lng}` w zapytaniu, nie razem z `returnToStart`): ten sam mechanizm co pętla, tylko końcem jest przystanek do 500 m od celu. Gdy cel jest dalej, niż pozwala czas, budżet rośnie do najszybszego dojazdu. Gdy przy celu nie ma przystanku albo nie da się do niego dojechać, planer zwraca zwykłą trasę. Odpowiedź ma `endsAtDestination` (tylko gdy podano cel; false, gdy nie dojechaliśmy). Podgląd `/debug/planner`: Shift + klik ustawia cel.
8. **Odpowiedzi z onboardingu** (opcjonalne pola zapytania): `tags` (wybrane kafelki, np. `jewish_warsaw`): miejsce z takim tagiem liczy się ×1,5 względem samej kategorii; `familiarity` (`first_time`/`know_a_bit`/`local`): wykładnik bogactwa miejsca 1,5 / 1 / 0,5, więc pierwszy raz w mieście dostaje miejsca z największą liczbą faktów, a mieszkaniec mniej znane; `storyStyle` (`trivia`/`fun`/`deep`): minimalny odstęp między opowieściami 30 / 45 / 90 s (`score.ts`, `select-stories.ts`). Bez pól zachowanie jak wcześniej.

**Ograniczenie danych:** miejsca są tylko ok. 3 km od 42 Warsaw (pomiar 17.10, 14:40, 485 miejsc), więc trasa 60 min w jedną stronę ma ostatnie miejsce ok. 30. min. Pętla i trasa 90 min ze wszystkimi kategoriami mają miejsca do końca. Rozwiązuje to więcej miejsc w Supabase dalej od Woli.

## 8. Opowieść i tryb demo (R4 + R3, M5–M6)

- `POST /v1/stories`: `story_cache` → prompt z faktów miejsca (tylko `facts`, `trivia`, `people`, `sources` z bazy) → LLM → walidacja wyjścia zod (`text`, `sourceIds[]` z listy wejściowej) → zapis do cache.
- Długość z `targetSec`: ok. 2,5 słowa na sekundę, trzy przedziały. Opowieść jako tekst.
- Prompt Sawy w `apps/api/src/prompts/`.
- `/demo` (R3): stała lokalizacja 42 Warsaw, `GET /v1/routes/demo`, symulowana jazda przyspieszona do ok. 1,5 min, przechodzi M1–M5 po kolei.
- Odporność demo: `scripts/prewarm-stories.ts` generuje opowieści trasy demo do `story_cache`; przy `DEMO_OFFLINE=1` API nie woła miasta ani LLM, tylko fixture i cache.

## 9. Harmonogram i zadania

Synchronizacja (10 min): **13:30, 15:00, 17:00, 22:00, 08:00**.

### M0 · 12:00–13:30 · szkielet i kontrakt

| Rola | Zadanie |
|---|---|
| R3 | Monorepo (pnpm, `apps/web`, `apps/api` z `/health`, `packages/shared`, Biome, Vitest, CI). Projekt na Vercelu |
| R1 | Projekt na Railway, deploy `/health`. Curl przystanków, linii i odjazdów → fixtures. Decyzja o rozkładzie statycznym (P1) |
| R2 | Migracja `places`, `place_photos`, `story_cache` + PostGIS. Seed GeoJSON → `places`. Lista zainteresowań |
| R4 | Test API Bielika. Port `LlmProvider` + `fake` + `claude`. Pierwszy prompt na 3 miejscach |
| Wszyscy | 13:30: kontrakt v0 (§5) w `packages/shared` |

### M1 · 13:30–17:00 · pionowy plaster

| Rola | Zadanie |
|---|---|
| R1 | Adapter `waw` (przystanki, linie, odjazdy), adapter rozkładu, mock `/v1/routes/plan` |
| R2 | `/v1/places`, `/v1/places/:id`. Licencje zdjęć. Scenariusz demo 1,5 min do 15:00 |
| R3 | M1 ekran startowy, M2 onboarding, M3 mapa z miejscami i slider, „Generuj” na mocku, lista punktów trasy |
| R4 | `/v1/stories` z cache i walidacją |

**Wyjście:** na telefonie: start → onboarding → mapa → „Generuj” (mock) → opowieść o pierwszym miejscu.

### M2 · 17:00–22:00 · prawdziwy planer i odtwarzacz

| Rola | Zadanie |
|---|---|
| R1 | Prawdziwy `/v1/routes/plan`, `/v1/routes/demo` |
| R2 | Pitch deck pod MVP |
| R3 | Odtwarzacz: postęp jazdy z rozkładu, karta miejsca ze źródłami, wersja mobilna |
| R4 | `prewarm-stories.ts`, `DEMO_OFFLINE` |

**22:00: MVP na produkcji, zakres zamknięty.**

### M3 · 22:00–08:00 · demo

- R3: M6 `/demo`, M7 kod QR i wygląd aplikacji (manifest, ikona, pełny ekran), test Playwright ścieżki demo.
- R4: rozgrzanie cache trasy demo, test `DEMO_OFFLINE`.
- R1: poprawki planera na trasie demo.
- R2: nagranie wideo demo jako zapas, README dla jury (zbiory danych, założenia, narzędzia, zakres AI).
- Wszyscy, co 2 h: ścieżka na własnym telefonie, błędy do `todo.md`.

### M4 · 08:00–11:00 · oddanie

08:00 próba pitcha → **09:00 zamrożenie kodu** → 10:00 ostatni deploy, test na 3 telefonach → **10:30 wysłanie**: repo, deck, dokumentacja z opisem użycia AI.

**Ścieżka krytyczna:** monorepo (12:30) → kontrakt (13:30) → miejsca w bazie → planer → opowieść → `/demo`. Gdy czas ucieka, najpierw upraszczamy planer: trasa jedną linią bez przesiadek.

## 10. Poza planem

Nie budujemy przed oddaniem MVP, nawet jeśli zostanie czas, bez decyzji zespołu zapisanej w `stan.md`:

- wszystko z sekcji „Po MVP” w PRD: przycisk „dalej”, głos (TTS), tryb „z wysiadaniem”, muzea i wystawy, rozpoznawanie powracającego użytkownika, wydarzenia i łączenie ludzi,
- czat z Sawą, podpowiedzi pogodowe, dłuższa historia przy korku, śledzenie pojazdu na żywo (ścieżka główna PRD, ale nie lista MVP),
- miejsca spoza 1 km (Wikipedia dla całej Warszawy), zapytania do Google Places na żywo (pobrane dane są w bazie, T-06), toalety.

## 11. Założenia

| # | Założenie | Kto może zmienić |
|---|---|---|
| Z1 | Backend to TypeScript + Hono w monorepo pnpm (ustalone ze Szczepanem 17.10, 11:40; do potwierdzenia przez zespół) | zespół |
| Z2 | Zostają 4 role; zadania dawnej R5 przejmuje R2, testy na telefonie robią wszyscy | zespół |
| Z3 | Przeglądarka nie łączy się z Supabase; wszystko idzie przez API | R2 |
| Z4 | Kolejność przystanków i kształty linii bierzemy z publicznego rozkładu statycznego Warszawy (GTFS), bo 19 zbiorów portalu tego nie daje | R1 |
| Z5 | Trasy MVP i demo w promieniu ok. 1 km od 42 Warsaw (52.2359, 20.9789), bo tam mamy dane | zespół |
| Z6 | Użytkownik wybiera 4 ogólne kategorie (`historical`, `cultural`, `sports`, `nature`, decyzja Szczepana 17.10). Miejsca zachowują 8 tagów z seedu R2; mapowanie `INTEREST_TAGS` w `packages/shared/src/interests.ts`. Dla `sports` i `nature` nie ma jeszcze miejsc | R3 + R2 |
| Z7 | Opowieść jako tekst (głos jest w „Po MVP”) | — |
| Z8 | Podglądy z Vercela łączą się z produkcyjnym API | R1 + R3 |
| Z9 | Biome zamiast ESLint + Prettier; Zustand do stanu odtwarzacza; podkład OpenFreeMap | R3 |
| Z10 | Regiony UE (Railway Amsterdam, Supabase Frankfurt) | R1 |

## 12. Pytania otwarte

| # | Pytanie | Kto | Do kiedy |
|---|---|---|---|
| P1 | Skąd kolejność przystanków linii: GTFS (który, jaka licencja) czy inne źródło? | R1 | 13:30 |
| P2 | API Bielika: adres, limity, czas odpowiedzi; który model Claude jako zapas | R4 | 13:00 |
| P3 | Kto ma którą rolę (wiersze w `zespol.md`) | zespół | 12:30 |
| P4 | Limity zapytań API miasta na token | R1 | 13:30 |
| P5 | Konta Vercel i Railway: zespołowe czy prywatne | zespół | 12:30 |

## 13. Start i deploy

Szkielet jest w repo (T-04): Node 24, pnpm 12.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local
pnpm dev            # web :3000, api :8787
pnpm lint && pnpm typecheck && pnpm test
```

- **Vercel (R3):** nowy projekt z repo, Root Directory `apps/web`, zmienna `NEXT_PUBLIC_API_URL` = adres z Railway.
- **Railway (R1):** usługa z repo, Root Directory zostaje `/` (monorepo), Config File Path `apps/api/railway.json`. Zmienne: `CORS_ORIGINS` (domena z Vercela), `CORS_PREVIEW_PATTERN` (podglądy Vercela). `PORT` ustawia Railway.
- Nowa trasa w API: plik w `apps/api/src/routes/`, podpięcie w `app.ts` przez `.route()`, schemat w `packages/shared`. Web dostaje typy sam przez `hc` w `apps/web/src/lib/api.ts`.
