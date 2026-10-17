# Plan wdrożenia MVP Sawy

Wersja 1, 17.10.2026, ok. 11:45. Na podstawie [10-prd.md](10-prd.md), [05-plan-architektury.md](05-plan-architektury.md), [03-dane.md](03-dane.md), [historia/](historia/README.md) i [spotkania z 11:00](spotkania/2026-10-17-1100-mvp-sawy.md). Zasady pisania kodu: [11-zasady-pracy-i-kodu.md](11-zasady-pracy-i-kodu.md).

**[Z]** oznacza założenie, którego zespół jeszcze nie potwierdził. Lista wszystkich założeń: §11. Pytania bez odpowiedzi: §12.

## 1. Cel i definicja „gotowe”

MVP to jedna ścieżka z PRD, działająca na telefonie z kodu QR, w niedzielę o 11:00:

> ekran startowy → wybór ok. 3 zainteresowań → mapa z lokalizacją i sliderem czasu → „Generuj” → trasa tramwajem/autobusem z listą miejsc → Sawa opowiada o mijanych miejscach (tekst) → podstrona `/demo` pokazuje to wszystko w ok. 1,5 min.

Punkt z listy MVP jest **gotowy**, gdy: działa na produkcji (Vercel + Railway), przechodzi ścieżkę na telefonie (szerokość 375 px), ma testy logiki z `domain/`, a `/demo` działa przy wyłączonym API miasta i LLM (tryb offline, §8).

Widoczne w demo zbiory z dane.um.warszawa.pl (kryterium 20%): przystanki, linie na przystanku, odjazdy, pozycje pojazdów, pogoda. Po MVP: kalendarz wydarzeń, utrudnienia w ruchu.

## 2. Stack

| Warstwa | Wybór | Dlaczego |
|---|---|---|
| Monorepo | **pnpm workspaces**, bez Turborepo **[Z]** | 3 pakiety, nie potrzeba narzędzia do cache buildów |
| Runtime | Node 22 LTS lub nowszy, TypeScript `strict` | Wspólny język dla 4 osób |
| Frontend | **Next.js (App Router)**, Tailwind, shadcn/ui | Ustalone wcześniej, szybkie UI |
| Mapa | MapLibre GL przez `react-map-gl/maplibre`, podkład OSM (np. OpenFreeMap) **[Z]** | Bez klucza API |
| Stan w web | URL (zainteresowania, czas), TanStack Query (dane z API), Zustand (odtwarzacz) **[Z]** | Powtarzalny link do demo, polling pozycji pojazdów |
| Backend | **Hono na Node** (`@hono/node-server`), `@hono/zod-validator`, klient `hc` w web | Lekki, typy kontraktu przechodzą do web bez generowania kodu |
| Walidacja i kontrakt | **zod** w `packages/shared` | Jedno źródło prawdy dla API i web |
| Baza | **Supabase** (Postgres + PostGIS), projekt `arvrzfqtqlrasftvvkaq` (już założony, `.mcp.json`) | Ustalone 17.10; PostGIS do „miejsca przy trasie” |
| Migracje | Supabase CLI, SQL w `supabase/migrations/` | Powtarzalne, w repo |
| LLM | Port `LlmProvider`: Bielik (główny), Claude przez `@anthropic-ai/sdk` (zapas, model z env, np. `claude-sonnet-5-5`), `fake` (testy i offline) | Bielik to plus u jury; zapas, gdy API Bielika zawiedzie |
| TTS | Port `TtsProvider`, po MVP | Decyzja R4 (T-43) |
| Logi | `pino` w API | JSON w logach Railway |
| Lint i format | **Biome** (jedno narzędzie, szybkie) **[Z]** | Mniej konfiguracji niż ESLint + Prettier w monorepo |
| Testy | Vitest; Playwright tylko na ścieżkę `/demo` | Szybkie, jeden runner |
| CI | GitHub Actions: typecheck, lint, test | Pilnuje zielonego `main` |
| Hosting | Vercel (web), **Railway** (api), Supabase; regiony UE: Railway Amsterdam, Supabase Frankfurt **[Z]** | Railway trzyma proces stale włączony (§3) |

## 3. Architektura

```
telefon (Next.js na Vercel)
   │  tylko HTTPS do API, NEXT_PUBLIC_API_URL
   ▼
apps/api (Hono na Railway, proces stale włączony)
   ├── adapters/waw ──────► dane.um.warszawa.pl  (token WAW_TOKEN, cache w pamięci)
   │      └─ poller pozycji pojazdów co 10 s (tylko gdy ktoś słucha, §7)
   ├── adapters/gtfs ─────► rozkład statyczny: kolejność przystanków i kształty linii, w pamięci [Z]
   ├── adapters/supabase ─► Postgres + PostGIS: places, place_photos, story_cache
   └── adapters/llm ──────► Bielik / Claude / fake
```

**Dlaczego osobny backend na Railway, a nie route handlers na Vercelu:**
- poller pozycji pojazdów co 10 s i graf rozkładu w pamięci wymagają procesu, który żyje dłużej niż jedno żądanie,
- strumień odpowiedzi LLM bez limitów czasu funkcji serverless,
- wszystkie sekrety (token miasta, klucz LLM, `service_role` Supabase) w jednym miejscu, web nie ma żadnego.

Przeglądarka nie łączy się bezpośrednio z Supabase ani z API miasta.

## 4. Struktura repo

```
Sawa/
  apps/
    web/                  # Next.js → Vercel (Root Directory: apps/web)
    api/                  # Hono → Railway (Root Directory: apps/api)
      src/{routes,services,domain,adapters,prompts,lib}/
  packages/
    shared/               # zod: kontrakt API, stałe, funkcje geo
  supabase/
    migrations/           # SQL
  scripts/                # seed-historia.ts, seed-wikipedia.ts, prewarm-stories.ts
  docs/                   # bez zmian
  .github/workflows/ci.yml
  biome.json  pnpm-workspace.yaml  package.json  tsconfig.base.json
  .env.example            # lista wszystkich zmiennych, puste wartości
```

Warstwy i zasady zależności: [11-zasady-pracy-i-kodu.md §4](11-zasady-pracy-i-kodu.md#4-warstwy-abstrakcji).

## 5. Kontrakt API (wersja 0, do zatwierdzenia o 13:30)

| Metoda i ścieżka | Wejście | Wyjście | Właściciel |
|---|---|---|---|
| `GET /health` | — | `{ ok, version, providers }` | wspólne |
| `GET /v1/places` | `bbox`, `interests?` | GeoJSON `FeatureCollection` z `PlaceSummary` | R2 |
| `GET /v1/places/:id` | — | `Place` (fakty, ciekawostki, ludzie, zdjęcia, źródła) | R2 |
| `GET /v1/transit/stops/near` | `lat`, `lng`, `radiusM` | `Stop[]` z liniami | R1 |
| `GET /v1/transit/vehicles` | `lines` | `Vehicle[]`, `stale` | R1 |
| `GET /v1/weather` | — | `Weather` + `tip?` („weź parasol”) | R1 |
| `POST /v1/routes/plan` | `{ origin: {lat,lng}, durationMin, interests[] }` | `Route` | R1 |
| `GET /v1/routes/demo` | — | stała `Route` z fixture | R1 |
| `POST /v1/stories` | `{ placeId, interests[], targetSec }` | `Story { text, sources[], model, cached }` | R4 |
| `POST /v1/chat` | `{ messages[], placeIds[] }` | strumień SSE z tekstem | R4 |

Najważniejsze typy w `packages/shared`:

```ts
type LatLng = { lat: number; lng: number };
type Interest = "war-and-uprising" | "architecture" | "people" | "jewish-warsaw" | "industry" | "street-art" | "religion" | "everyday-life"; // [Z] lista do potwierdzenia przez R3 i R2
type Leg = { line: string; mode: "tram" | "bus"; fromStopId: string; toStopId: string; departAt: string; durationMin: number; lngLats: [number, number][] };
type RoutePlace = { placeId: string; name: string; position: LatLng; etaSec: number; windowSec: number; score: number };
type Route = { id: string; legs: Leg[]; places: RoutePlace[]; totalMin: number; weather?: Weather };
```

`etaSec` to czas od startu jazdy do momentu, gdy miejsce jest za oknem; `windowSec` to czas do następnego miejsca, z niego wynika długość opowieści.

**Mock najpierw:** do 15:00 `POST /v1/routes/plan` zwraca fixture z kontraktu, żeby R3 i R4 nie czekali na prawdziwy planer.

## 6. Model danych (Supabase)

```sql
places        (id text pk, name text, name_en text, kind text, geom geography(Point,4326),
               address_today text, address_historic text, period text,
               facts jsonb, trivia jsonb, people jsonb, old_names text[], summary_en text,
               sources jsonb, confidence text, interests text[], source_set text, -- 'historia' | 'wikipedia' | 'google'
               updated_at timestamptz)
place_photos  (id bigserial pk, place_id text fk, url text, caption text, year text,
               source text, license text, author text)          -- tylko z licencją
story_cache   (key text pk, place_id text fk, text text, sources jsonb, model text, created_at timestamptz)
```

- Indeks GIST na `places.geom`. Funkcja RPC `places_near_line(line geojson, radius_m int, interests text[])` zwraca miejsca w buforze trasy z odległością i położeniem wzdłuż linii (`ST_LineLocatePoint`).
- `interests` przypisuje skrypt seed: reguły po `kind` i słowach kluczowych, a w razie wątpliwości LLM w trakcie hackathonu **[Z]**.
- Klucz `story_cache` = `placeId + posortowane interests + przedział długości (krótka / średnia / długa)`.
- Źródło: [historia/sawa-historia.geojson](historia/sawa-historia.geojson) (326 punktów, 1 km wokół 42 Warsaw); po MVP Wikipedia geosearch dla korytarzy tras w całej Warszawie.

## 7. Planer trasy (R1): algorytm MVP

Celem nie jest dojazd z A do B, tylko **przejażdżka obok ciekawych miejsc w zadanym czasie**, bez wysiadania poza przesiadkami.

1. Przystanki w promieniu 500 m od `origin` (API miasta, cache 24 h).
2. Dla każdej linii z przystanku (`get_ztm_lista_linii_na_przystanku`): kolejne przystanki i kształt linii z rozkładu statycznego **[Z]**, najbliższy odjazd z `get_ztm_odjazdy_linii_z_przystanku`.
3. Ocena odcinka: suma punktów miejsc w buforze 150 m (`places_near_line`), waga za dopasowanie do zainteresowań, kara za powtórzenie miejsca. Liczona na minutę jazdy.
4. Przeszukiwanie wiązkowe (beam search, szerokość 5): na przystankach przesiadkowych dokładasz kolejny odcinek, maksymalnie 2 przesiadki, aż suma czasu ≈ `durationMin` (±10%).
5. Wynik: `Route` z `legs` i `places` posortowanymi po `etaSec`.

Funkcje oceny i wyszukiwania są czyste (`domain/routing/`) i mają testy na małym sztucznym grafie.

**Pozycja „za oknem”:**
- MVP i `/demo`: symulowany postęp wzdłuż `lngLats` według rozkładu (czas jazdy z rozkładu).
- Po MVP (T-14): dopasowanie do prawdziwego pojazdu (linia + brygada najbliżej GPS użytkownika) i korekta `etaSec` o opóźnienie; przy korku odtwarzacz wybiera dłuższą wersję opowieści.

**Fallback bez rozkładu statycznego:** poller zapisuje pozycje pojazdów wybranych linii przez ok. 1 h, z nich powstaje kształt linii dla trasy demo. Tylko dane miasta.

## 8. Opowieść, czat i tryb offline (R4)

- `POST /v1/stories`: serwis sprawdza `story_cache` → buduje prompt z faktów miejsca (tylko `facts`, `trivia`, `people`, `sources` z bazy) → LLM → walidacja wyjścia zod (`text`, `sourceIds[]` z listy wejściowej) → zapis do cache.
- Długość z `targetSec`: ok. 2,5 słowa na sekundę mowy, trzy przedziały.
- Prompt Sawy w `apps/api/src/prompts/` (persona: rówieśniczka, która mieszka w Warszawie rok, fakty tylko ze źródłami). Pogoda trafia do promptu jako kontekst.
- Czat: kontekst = fakty miejsc z trasy (`placeIds`), strumień SSE.
- **Tryb offline (`DEMO_OFFLINE=1` albo awaria):** `/v1/routes/demo` z fixture, opowieści z `story_cache` (skrypt `prewarm-stories.ts` generuje je w nocy dla trasy demo i 3 zestawów zainteresowań), pogoda z ostatniej wartości. `/demo` musi przejść cały scenariusz bez internetu poza Vercelem i Railway.

## 9. Harmonogram i zadania

Synchronizacja (10 min, na stojąco): **13:30, 15:00, 17:00, 22:00, 08:00**. Na każdej: co działa na produkcji, co blokuje, co wycinamy.

### M0 · 12:00–13:30 · szkielet i kontrakty

| Rola | Zadanie |
|---|---|
| R3 | Monorepo: pnpm, `apps/web` (create-next-app), `apps/api` (Hono, `/health`), `packages/shared`, Biome, Vitest, CI. **Push do 12:30**, bo blokuje wszystkich. Projekt na Vercelu |
| R1 | Projekt na Railway, deploy `/health`. Curl każdego endpointu ZTM i pogody → fixtures w `__fixtures__/`. Decyzja o rozkładzie statycznym (§12, P1) |
| R2 | Migracja `places`, `place_photos`, `story_cache` + PostGIS. Skrypt seed GeoJSON → `places`. Lista zainteresowań i reguły tagowania |
| R4 | Test API Bielika (T-01). Port `LlmProvider` + `fake` + `claude`. Pierwszy prompt na 3 miejscach z historii |
| Wszyscy | 13:30: zatwierdzenie kontraktu v0 (§5) w `packages/shared` |

**Wyjście:** web na Vercelu woła `/health` na Railway; w Supabase są 326 miejsca.

### M1 · 13:30–17:00 · pionowy plaster

| Rola | Zadanie |
|---|---|
| R1 | `/v1/transit/stops/near`, `/v1/weather`, mock `/v1/routes/plan`. Adapter rozkładu statycznego |
| R2 | `/v1/places` i `/v1/places/:id`, funkcja `places_near_line`. Licencje zdjęć (T-22). Scenariusz demo 1,5 min (T-50) do 15:00 |
| R3 | Ekran startowy, onboarding zainteresowań, mapa z miejscami z API, slider czasu, „Generuj” na mocku, widok trasy |
| R4 | `/v1/stories` z cache i walidacją; persona Sawy dopracowana na 10 miejscach |

**Wyjście:** na telefonie: onboarding → mapa z miejscami → „Generuj” (mock) → opowieść o pierwszym miejscu z LLM.

### M2 · 17:00–22:00 · prawdziwy planer i odtwarzacz

| Rola | Zadanie |
|---|---|
| R1 | Prawdziwy `/v1/routes/plan` (beam search, przesiadki), `/v1/routes/demo`, `/v1/transit/vehicles` z pollerem |
| R2 | Seed Wikipedii dla korytarzy tras poza 1 km (jeśli P3 = tak). Pitch deck pod MVP (T-51) |
| R3 | Odtwarzacz: symulowany postęp, karta miejsca, źródła i zdjęcia, wersja mobilna (T-35). Zakładka czatu |
| R4 | `/v1/chat` (SSE), podpowiedź pogodowa w opowieści, `prewarm-stories.ts` |

**22:00: MVP na produkcji, zakres zamknięty.**

### M3 · 22:00–08:00 · demo i odporność

- R3: `/demo` (stała lokalizacja 42 Warsaw, symulacja 1,5 min), kod QR, wygląd aplikacji (manifest, ikona Sawy, pełny ekran), test Playwright ścieżki demo.
- R4: tryb offline, rozgrzanie cache dla trasy demo; po MVP: TTS (`FEATURE_TTS`).
- R1: po MVP: dopasowanie do prawdziwego pojazdu i korek → dłuższa opowieść (T-14); przycisk „dalej” (`FEATURE_SKIP_BUTTON`), jeśli zespół go zatwierdzi.
- R2: nagranie wideo demo jako zapas (T-55), README dla jury: zbiory danych, założenia, narzędzia, zakres AI.
- Wszyscy, co 2 h: ścieżka na własnym telefonie, błędy do `todo.md` z tagiem roli.

### M4 · 08:00–11:00 · oddanie

08:00 próba pitcha z zegarkiem → **09:00 zamrożenie kodu** → 10:00 ostatni deploy, test na 3 telefonach → **10:30 wysłanie**: repo, deck, dokumentacja, `ai-log.md`.

## 10. Ścieżka krytyczna i co wycinamy

**Krytyczne:** monorepo (R3, 12:30) → kontrakt (13:30) → miejsca w bazie (R2) → planer (R1) → opowieść (R4) → `/demo` (R3).

Jeśli o 17:00 lub 22:00 jesteśmy spóźnieni, wycinamy w tej kolejności:
1. czat,
2. podpowiedź pogodowa (pogoda zostaje jako widżet, bo to zbiór miasta),
3. Wikipedia poza 1 km (trasa demo zostaje na Woli),
4. przesiadki (trasa jedną linią),
5. pozycje pojazdów na żywo (zostaje widok pojazdów na mapie jako dowód użycia danych).

Nie wycinamy: onboardingu, mapy, trasy, opowieści, `/demo`, trybu offline.

## 11. Założenia

| # | Założenie | Kto może zmienić |
|---|---|---|
| Z1 | Backend to TypeScript + Hono w monorepo pnpm (ustalone ze Szczepanem 17.10, 11:40; do potwierdzenia przez zespół) | zespół |
| Z2 | Zostają 4 role; zadania dawnej R5 przejmuje R2, testy na telefonie robią wszyscy | zespół |
| Z3 | Przeglądarka nie łączy się z Supabase; wszystko idzie przez API | R2 |
| Z4 | Kolejność przystanków i kształty linii bierzemy z publicznego rozkładu statycznego Warszawy (GTFS), bo 19 zbiorów portalu tego nie daje. Rozkład to uzupełnienie, zbiory miasta zostają podstawą | R1 |
| Z5 | Demo i domyślna lokalizacja to 42 Warsaw (52.2359, 20.9789), bo tam mamy gęste dane | R2 |
| Z6 | Lista zainteresowań z §5 (8 pozycji) | R3 + R2 |
| Z7 | Opowieść tekstowa w MVP, głos po MVP | R4 |
| Z8 | Podglądy z Vercela łączą się z produkcyjnym API | R1 + R3 |
| Z9 | Biome zamiast ESLint + Prettier; Zustand do stanu odtwarzacza; podkład mapy OpenFreeMap | R3 |
| Z10 | Regiony UE (Railway Amsterdam, Supabase Frankfurt) | R1 |
| Z11 | Bez kont i bez zapisu lokalizacji użytkownika | zespół |

## 12. Pytania otwarte

| # | Pytanie | Kto | Do kiedy |
|---|---|---|---|
| P1 | Skąd kolejność przystanków linii: GTFS (który, jaka licencja), stare API `api.um.warszawa.pl`, czy kształty z pozycji pojazdów? | R1 | 13:30 |
| P2 | API Bielika: adres, limity, czas odpowiedzi, czy jest strumień; który model Claude jako zapas | R4 | 13:00 |
| P3 | Miejsca poza 1 km: Wikipedia geosearch (kiedy i dla jakiego obszaru), czy demo tylko na Woli? Google Places w ogóle (T-06)? | R2 | 15:00 |
| P4 | Przycisk „dalej” w MVP czy po MVP | zespół | 15:00 |
| P5 | Kto ma którą rolę (wiersze w `zespol.md`) | zespół | 12:00 |
| P6 | Limity zapytań API miasta na token; czy jeden token na Railway wystarczy | R1 | 13:30 |
| P7 | Konta Vercel i Railway: zespołowe czy czyjeś prywatne; kto płaci, jeśli darmowy plan nie wystarczy | zespół | 12:30 |
| P8 | Toalety (T-05): rezygnujemy w MVP? Propozycja: tak | R1 | 14:00 |

## 13. Komendy startowe (R3, 12:00)

```bash
corepack enable && corepack prepare pnpm@latest --activate
pnpm dlx create-next-app@latest apps/web --ts --tailwind --app --src-dir --import-alias "@/*" --use-pnpm --no-eslint
mkdir -p apps/api/src packages/shared/src supabase/migrations scripts
pnpm --filter web dlx shadcn@latest init
pnpm --filter web add maplibre-gl react-map-gl @tanstack/react-query zustand
pnpm --filter api add hono @hono/node-server @hono/zod-validator zod pino
pnpm --filter shared add zod
pnpm add -Dw @biomejs/biome vitest typescript tsx
```

`pnpm-workspace.yaml`: `packages: ["apps/*", "packages/*", "scripts"]`. Skrypty w głównym `package.json`: `dev` (web + api równolegle), `typecheck`, `lint`, `test`, `format`.
