# Plan bazy miejsc (Supabase)

17.10.2026, ok. 13:00, Jasiek z agentem.

## Stan wdrożenia (13:10)

- Migracje `supabase/migrations/20261017130000_places.sql` i `…131000_places_rpc.sql` wgrane przez MCP (PostGIS, `places`, `place_photos`, `story_cache`, 3 funkcje RPC). RPC sprawdzone na pustej tabeli.
- Seed: `scripts/seed-historia.ts` + `scripts/historia/` (mapper, reguły zainteresowań, 5 testów). `--dry-run` mapuje 326/326 miejsc i 351 zdjęć.
- **Licencje pomijamy** (decyzja Jaśka 17.10: użytek własny). Wgrywamy wszystkie zdjęcia, pole `license` zostaje z tekstem z danych. §6 nieaktualny do czasu publikacji.
- **13:08: dane w bazie**, 326 miejsc i 351 zdjęć; drugie uruchomienie nie dubluje. Test: `places_near_line` wzdłuż al. Solidarności (150 m) zwraca 108 miejsc.
- Uruchomienie: w głównym `.env.local` (nie w git) `SUPABASE_URL` i `SUPABASE_SERVICE_ROLE_KEY`, potem `pnpm --filter @sawa/scripts seed:historia`. Rozwija [12-plan-mvp.md §6](12-plan-mvp.md#6-model-danych-supabase). Zadania: T-20 (schemat), T-21 (seed), T-22 (licencje zdjęć). **[Z]** = założenie do potwierdzenia.

## 1. Co mamy

**Baza:** projekt `arvrzfqtqlrasftvvkaq` jest pusty (0 tabel w `public`). PostGIS nie jest włączony, `supabase/migrations/` jest pusty, `scripts/` ma tylko `package.json` z `tsx`.

**Dane** ([historia/sawa-historia.geojson](historia/sawa-historia.geojson)): 326 punktów (`Point`, wszystkie w ok. 1 km od 42 Warsaw), id unikalne.

| Pole GeoJSON | Typ i pokrycie | Uwagi |
|---|---|---|
| `id`, `nazwa`, `name_en`, `typ`, `summary_en` | tekst, 326/326 | `typ`: budynek 118, pomnik 66, tablica 48, ulica 27, miejsce 27, mural 20, zdarzenie 9, swiatynia 7, cmentarz 4 |
| `fakty`, `ciekawostki` | lista tekstów: 2056 + 311 | Mediana ok. 330 znaków faktów na punkt. To jest wsad dla LLM |
| `zrodla` | lista `{tytul, url}`, 546 | Fakty nie wskazują, z którego źródła pochodzą |
| `ludzie` | lista `{kto, rola, wiki?}`, 379 wpisów w 170 punktach | |
| `zdjecia` | 351 wpisów w 206 punktach, różne kształty (`url` / `url_pliku` / `autor` / `rok`) | Licencje: „sprawdzić na Commons” 136, CC BY-NC (warszawa1939) 132, PD 55, CC BY-SA 3.0 de 25, inne 3 |
| `dzis` | Google Places, 506 wpisów w 224 punktach | Warunki Google: max 30 dni. Nie dla LLM |
| `adres_dzis`, `adres_historyczny`, `okres`, `dawne_nazwy`, `nazwy_historyczne` | częściowe | `okres` to wolny tekst („1770/1784–dziś”), nie data |
| `lokalizacja`, `pewnosc`, `pas`, `odleglosc_m`, `istnieje`, `zrodlo_rekordu` | metadane | 55 rekordów `g-*` (tylko Google) i 77 `osm-*` mają ubogą treść |
| `do_weryfikacji`, `uwagi`, `zrodla_wikipedia_sprawdzone` | jakość | 35 faktów do weryfikacji |

Pliki obok: `zdjecia.json` (31 zdjęć z Commons z licencją, już dopięte do punktów), `ludzie.json` (12 osób), `os-czasu.json` (33 wydarzenia). W MVP nie są potrzebne poza zdjęciami.

## 2. Zasada: kształt bazy = kształt użycia

Aplikacja czyta miejsca na trzy sposoby i pod nie projektujemy schemat:

1. **Mapa (R3)**: wszystkie punkty w bbox, lekko (id, nazwa, typ, zainteresowania, pozycja) → GeoJSON dla MapLibre.
2. **Planer (R1)**: miejsca w buforze linii trasy, z położeniem wzdłuż linii.
3. **Opowieść (R4)**: jedno miejsce w całości (fakty, ciekawostki, ludzie, źródła z id) → prompt.

Stąd: **jedna płaska tabela `places`** (kolumny do filtrowania i wyświetlania, listy jako `jsonb`, bo zawsze czytamy je razem z miejscem), osobna tabela tylko dla zdjęć (filtr licencji) i cache opowieści. Bez osobnych tabel faktów i osób: nikt ich nie odpytuje osobno, a złączenia tylko by przeszkadzały. Gotowe zapytania jako funkcje RPC, żeby adapter w API był jedną linijką `supabase.rpc(...)`.

## 3. Schemat (migracje)

`supabase/migrations/20261017130000_places.sql`:

```sql
create extension if not exists postgis with schema extensions;

create table places (
  id            text primary key,              -- id z GeoJSON, stabilne między seedami
  name          text not null,
  name_en       text,
  kind          text not null,                 -- typ: building|monument|plaque|street|site|mural|event|church|cemetery
  geom          geography(Point, 4326) not null,
  lat           double precision generated always as (st_y(geom::geometry)) stored,
  lng           double precision generated always as (st_x(geom::geometry)) stored,
  address_today text,
  address_historic text,
  period        text,                          -- wolny tekst z danych
  still_exists  boolean,
  summary_en    text,
  facts         jsonb not null default '[]',   -- string[]
  trivia        jsonb not null default '[]',   -- string[]
  people        jsonb not null default '[]',   -- {name, role, wikiUrl?}[]
  former_names  jsonb not null default '[]',   -- string[] + {name, from, to}[] scalone
  sources       jsonb not null default '[]',   -- {id: "s1", title, url}[]  ← id do cytowania przez LLM
  interests     text[] not null default '{}',
  confidence    text check (confidence in ('high','medium','low')),
  location_precision text check (location_precision in ('exact','approx')),
  origin        text,                          -- wiki|osm|google|warszawa1939
  richness      smallint not null default 0,   -- liczba faktów + ciekawostek, do sortowania i odcięcia ubogich
  notes         text,                          -- uwagi + do_weryfikacji (dla ludzi, nie dla LLM)
  raw           jsonb not null,                -- oryginalne properties, nic nie gubimy
  updated_at    timestamptz not null default now()
);
create index places_geom_gix on places using gist (geom);
create index places_interests_gin on places using gin (interests);

create table place_photos (
  id        bigserial primary key,
  place_id  text not null references places(id) on delete cascade,
  url       text not null,             -- plik (url_pliku)
  page_url  text,                      -- strona źródła, do podpisu
  caption   text, year text, author text,
  source    text not null,             -- commons|warszawa1939
  license   text not null,             -- znormalizowana: PD|CC-BY-SA-3.0-DE|CC-BY-NC|...
  unique (place_id, url)
);

create table story_cache (
  key        text primary key,          -- placeId + posortowane interests + przedział długości
  place_id   text not null references places(id) on delete cascade,
  text       text not null,
  source_ids text[] not null,
  model      text not null,
  created_at timestamptz not null default now()
);

alter table places enable row level security;       -- bez polityk: dostęp tylko service_role (Z3)
alter table place_photos enable row level security;
alter table story_cache enable row level security;
```

`supabase/migrations/20261017131000_places_rpc.sql`:

| Funkcja | Wejście | Wyjście | Dla kogo |
|---|---|---|---|
| `places_in_bbox(min_lng, min_lat, max_lng, max_lat, interests text[] default null)` | bbox, opcjonalny filtr `interests && $5` | gotowy GeoJSON `FeatureCollection` (`jsonb`) z `PlaceSummary` | `GET /v1/places` → R3 wrzuca prosto do MapLibre |
| `places_near_line(line_geojson jsonb, radius_m int default 150, interests text[] default null)` | linia trasy (`LineString`) | wiersze `id, name, kind, interests, lat, lng, distance_m, fraction` (`ST_LineLocatePoint`, 0–1) posortowane po `fraction` | planer R1 (§7 planu MVP) |
| `place_detail(id text)` | id | `places` bez `raw` + zdjęcia jako tablica | `GET /v1/places/:id`, opowieść R4 |

Typy TS: `generate_typescript_types` z MCP do `apps/api/src/adapters/supabase/database.types.ts` po każdej migracji.

## 4. Seed: `scripts/seed-historia.ts`

Uruchomienie: `pnpm --filter @sawa/scripts seed:historia` (env `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` z `.env.local`). Idempotentny: `upsert` po `id` i po `(place_id, url)`, więc puszczamy go po każdej zmianie danych lub schematu.

Kroki (czyste funkcje mapujące w osobnym pliku z testem Vitest na 3 przykładowych punktach):

1. Wczytaj GeoJSON, zwaliduj zod (minimum: `id`, `nazwa`, `typ`, `Point`). Błędny rekord = log i pomiń, nie przerywaj.
2. **Mapowanie pól** (polskie → angielskie, warstwa antykorupcyjna wg [11 §4](11-zasady-pracy-i-kodu.md#4-warstwy-abstrakcji)): `typ` → `kind` (słownik), `pewnosc` → `confidence`, `lokalizacja` → `location_precision`, `ludzie[].kto/rola/wiki` → `name/role/wikiUrl`, `dawne_nazwy` + `nazwy_historyczne` → `former_names`.
3. **Źródła z id:** `zrodla` → `[{id:"s1", title, url}, ...]`. LLM zwraca `sourceIds` z tej listy (kontrakt `Story` w 12 §5).
4. **`geom`** jako `SRID=4326;POINT(lng lat)` (EWKT, supabase-js przyjmie tekst).
5. **`interests`** regułami (§5).
6. **`richness`** = `fakty.length + ciekawostki.length`.
7. **Pomijamy `dzis`** (Google, limit 30 dni, nie dla LLM). Zostaje tylko w `raw`; jeśli T-06 = tak, osobny cache (T-23).
8. **Zdjęcia** → `place_photos` z normalizacją licencji (§6). Odrzucone zdjęcia do `scripts/out/photos-rejected.json` (nie w git), liczby w logu.
9. Na końcu raport: ile miejsc, ile zdjęć przyjętych i odrzuconych, rozkład `interests`, miejsca bez zainteresowań.

Batch: 326 wierszy to jeden `upsert` (lub 4 po 100). Czas: sekundy.

## 5. Zainteresowania **[Z6, do ustalenia z R3]**

Proponowana lista (klucze w `packages/shared`, etykiety PL w web) i reguły seed (słowa kluczowe w nazwie, faktach i ciekawostkach plus `kind`). Test na danych 17.10:

| Klucz | Reguła (regex po tekście, małe litery) | Punktów |
|---|---|---|
| `war_uprising` (wojna i Powstanie) | `powsta\|1944\|okupac\|niemc\|rzez\|wojn\|egzekuc` | 179 |
| `architecture` | `kamienic\|architekt\|projekt\|secesj\|modernis` + kind `building` | 124 |
| `industry` (przemysł i technika) | `fabry\|zakład\|elektrown\|browar\|tramwaj\|kolej` | 96 |
| `religion` | kind `church`/`cemetery` + `kości\|cerkiew\|synagog\|parafi\|zakon` | 66 |
| `jewish_warsaw` | `getto\|getcie\|żyd\|synagog\|ringelblum\|korczak` | 45 |
| `everyday_life` (handel, kino, gwara) | `bazar\|targ\|kercelak\|sklep\|handl\|kino\|gwar` | 43 |
| `street_art` | kind `mural` + `mural\|graffiti\|rzeźb` | 42 |
| `people` (znane postaci) | `people` niepuste | 170 |

82 punkty nie łapią żadnej reguły (głównie ubogie `g-*` i `osm-*`): dostają `everyday_life` albo zostają bez zainteresowań i pojawiają się tylko bez filtra. Reguły trzymamy w jednym pliku `scripts/interests.ts`, żeby R3/R2 mogli je dostroić i puścić seed ponownie.

## 6. Licencje zdjęć (T-22)

| W danych | Decyzja | Ile |
|---|---|---|
| `Public domain`, `Copyrighted free use` | przyjmij | 56 |
| `CC BY-SA 3.0 de` | przyjmij, podpis autora | 25 |
| `CC BY-NC wg strony…` (warszawa1939.pl) | przyjmij na hackathon, z podpisem; flaga `CC-BY-NC` do usunięcia przy komercjalizacji | 132 |
| `sprawdzić na Commons`, `do sprawdzenia…` | **krok opcjonalny:** seed pyta Commons API (`prop=imageinfo&iiprop=extmetadata`, partia po 50 tytułów) o `LicenseShortName` i `Artist`; co nie ma licencji, odpada | 138 |

Bez kroku z Commons API przyjmujemy ok. 213 zdjęć z 351. Krok z API to ok. 30 min pracy i jedno zapytanie na 50 plików.

## 7. Kolejność pracy

1. Migracja 1 (PostGIS + tabele) przez plik w `supabase/migrations/` i `apply_migration` z MCP. Sprawdzić `get_advisors` (RLS).
2. `scripts/seed-historia.ts` bez zdjęć z Commons API → 326 miejsc w bazie. Sprawdzić w SQL: `select kind, count(*) from places group by 1`.
3. Migracja 2: RPC `places_in_bbox`, `place_detail`, `places_near_line`. Test SQL na bbox 1 km i na linii wzdłuż al. Solidarności.
4. Wygenerować typy TS, adapter `apps/api/src/adapters/supabase/places-repository.ts` (port `PlacesRepository` + `fake` z fixture 5 miejsc).
5. Zdjęcia z Commons API (T-22), potem ewentualnie `story_cache` dla demo (R4).

## 8. Do decyzji

| Pytanie | Kto |
|---|---|
| Lista zainteresowań (§5) | R3 + R2 |
| Czy rekordy `g-*` i `osm-*` z `richness < 2` pokazywać na mapie i w trasie, czy tylko w bazie | R2 + R4 |
| Czy robimy krok z Commons API dla 138 zdjęć | R2 |
