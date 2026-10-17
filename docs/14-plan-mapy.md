# Plan mapy (R3)

17.10.2026, ok. 13:30, Antek (R3) z agentem. Rozwija [12-plan-mvp.md](12-plan-mvp.md) §5, §9 (M3) i [13-plan-bazy.md](13-plan-bazy.md) §3. Zadania: T-30, T-33. **[Z]** = założenie do potwierdzenia.

## 1. Cel

Mapa w `apps/web` pokazuje:

1. **Ciekawe miejsca z bazy** (326 punktów z Supabase). Klik w punkt otwiera kartę miejsca: nazwa, typ, okres, fakty, zdjęcie, źródła.
2. **Trasę z planera** (R1, Szczepan): linie przejazdu ZTM po odcinkach (`legs`) i ponumerowane miejsca na trasie (`places`, w kolejności `etaSec`).

## 2. Mapbox czy MapLibre

**Decyzja (Antek, 17.10):** robimy **MapLibre GL** (`maplibre-gl` **5.x** + `react-map-gl/maplibre` 8). Wersja 6 odpada: szuka pliku workera obok swojego modułu (`import.meta.url`), a po bundlowaniu przez Next ten plik nie istnieje, zgodnie z planem MVP (§2, Z9) i kartą R3. To otwarty fork Mapbox GL JS z tym samym API (źródła, warstwy, styl JSON). Mapbox wymaga tokenu i jest płatny powyżej limitu, a MapLibre nie potrzebuje klucza.

Podkład: **OpenFreeMap**, styl `https://tiles.openfreemap.org/styles/positron` (jasny i spokojny, punkty są na nim czytelne) **[Z]**, bez klucza.

## Stan wdrożenia (15:00, PR z gałęzi `r3/maplibre-map`)

- Strona `/mapa` (link „Otwórz mapę” na `/`). Kroki 1–6 i 5a z §10 zrobione.
- Miejsca z `GET /v1/places` po kafelkach z widoku (od 16:07, niżej §3), karta ze szczegółami z `GET /v1/places/:id`: okres, adres, tagi, pierwsze zdjęcie z podpisem, fakty (3 + rozwiń), źródła. Bez kluczy Supabase API serwuje `fake`.
- Zainteresowania w `?i=` to kategorie (`historical`, `cultural`, `sports`, `nature`). Miejsca mają tagi, filtr mapuje je przez `interestsOfTags` z `packages/shared`.
- Trasa: `useDemoRoute` w `features/planner` woła `GET /v1/routes/demo` (planer R1). Brak API → mapa bez trasy i komunikat.
- Sprawdzone zrzutami w headless Chromium (375 px i desktop).
- Do zrobienia: `fitBounds` nie uwzględnia otwartej karty (trasa bywa pod nią), ostrzeżenie „Expected number, found null” w konsoli (prawdopodobnie styl podkładu).

## API `SawaMap` dla ekranów (17.10, uzgodnione z Pawłem)

Podział R3: Antek robi mapę (`features/map`, warstwy, karta miejsca, „za oknem”), Paweł ekrany i `/demo`. Ekrany używają tylko `SawaMap` z `@/features/map`, ładowanej przez `next/dynamic` z `ssr: false`. Mapa wypełnia rodzica.

| Prop | Typ | Co robi |
|---|---|---|
| `interests` | `Interest[]` | kategorie z onboardingu, pusta lista = wszystkie miejsca |
| `route?` | `Route` | trasa z planera: linie, ponumerowane miejsca, podpis danych |
| `camera?` | `{type:"center", center, zoom?}` · `{type:"fit", points, maxZoom?}` · `{type:"route"}` | widok; bez propsa mapa dopasowuje się do trasy. Rusza się tylko, gdy żądanie naprawdę się zmieni |
| `padding?` | `{top,right,bottom,left}` (częściowo) | miejsce zajęte przez panele ekranu, np. `{ bottom: 380 }` pod arkusz |
| `user?` | `LatLng` | niebieska kropka użytkownika |
| `activeStopId?` | `string` (id miejsca) | wyróżnione miejsce trasy, o którym jest teraz opowieść |
| `onStopClick?` | `(placeId) => void` | klik w miejsce trasy; zastępuje wtedy wbudowaną kartę dla miejsc trasy |
| `hasPlaceSheet?` | `boolean`, domyślnie `true` | wbudowana karta miejsca (`?p=`); wyłącz, gdy ekran ma własną |
| `hasZoomControls?` | `boolean`, domyślnie `true` | przyciski zoomu w prawym górnym rogu |

**Playground:** `/mapa/playground` (`features/map-playground`). Każdy prop ma kontrolkę, nakładka pokazuje obszar `padding`, dziennik zbiera `onStopClick`, a na dole jest gotowy JSX do skopiowania. Trasa demo albo prawdziwy planer (`POST /v1/routes/plan`).

## 3. Przepływ danych

Przeglądarka nie łączy się z Supabase (Z3). Wszystko idzie przez API.

```
features/map (React)
  └─ hooks (TanStack Query) ─► lib/api.ts (hc) ─► apps/api (Hono)
                                                    ├─ GET  /v1/places?bbox&interests → RPC places_in_bbox  → GeoJSON FeatureCollection   (R2, Jasiek)
                                                    ├─ GET  /v1/places/:id            → RPC place_detail    → Place + photos            (R2, Jasiek)
                                                    └─ POST /v1/routes/plan           → planer               → Route { legs, places }    (R1, Szczepan)
```

| Dane | Skąd | Kiedy pobieramy | Cache (Query) |
|---|---|---|---|
| Miejsca na mapie | `GET /v1/places?bbox=` osobno dla każdego kafelka siatki w widoku | po zatrzymaniu mapy (`moveend`), tylko nowe kafelki | per kafelek, `staleTime: Infinity`, `gcTime` 30 min |
| Szczegóły miejsca | `GET /v1/places/:id` | po kliknięciu punktu, prefetch przy najechaniu na desktopie | per `id` |
| Trasa | `POST /v1/routes/plan` (`origin`, `durationMin`, `interests`) | po „Generuj” | per parametry |

**Bbox z widoku (17.10, 16:07, decyzja Antka).** Baza ma już ok. 1300 miejsc w całej Warszawie, a stały prostokąt wokół 42 Warsaw gubił ich większość. Widok dzielimy na stałą siatkę kafelków 0,04° × 0,025° (ok. 2,7 × 2,8 km, `lib/place-tiles.ts`) i o każdy kafelek pytamy osobno. Przesunięcie mapy dociąga tylko nowe kafelki, a powrót bierze je z cache. Poniżej zoomu 13 mapa nie pobiera miejsc i pokazuje „Przybliż mapę, żeby zobaczyć miejsca”. Na bardzo szerokim ekranie najwyżej 36 kafelków najbliżej środka. Karta z linku `?p=` działa także wtedy, gdy miejsce leży poza widokiem: nazwa przychodzi z `GET /v1/places/:id`.

## 4. Kontrakt (potrzebny z T-63)

W `packages/shared` (zmiana kontraktu = osobny PR z akceptacją R2 i R1):

```ts
PlaceSummary = { id, name, kind, interests: Interest[], richness }     // properties w Feature, z places_in_bbox
PlacesGeoJson = FeatureCollection<Point, PlaceSummary>
Place = PlaceSummary & { period?, addressToday?, facts: string[], trivia: string[],
        people: {name, role, wikiUrl?}[], sources: {id, title, url}[], photos: Photo[] }
Route, Leg (lngLats: [lng, lat][]), RoutePlace                       // jak w 12-plan-mvp §5
```

Uwaga: `place_detail` zwraca kolumny w snake_case (`address_today`). Na camelCase zamienia je adapter R2 w API, nie web.

## 5. Struktura w `apps/web`

Zgodnie z [11-zasady-pracy-i-kodu.md](11-zasady-pracy-i-kodu.md) §4: komponent nie woła `fetch`, inne funkcje importują tylko z `index.ts`.

```
apps/web/src/features/map/
  components/
    sawa-map.tsx          # "use client"; <Map> z react-map-gl, podkład, kontrolki, obsługa kliknięć
    places-layer.tsx      # <Source type="geojson"> + warstwy circle/symbol dla miejsc
    route-layer.tsx       # linie odcinków trasy + ponumerowane miejsca trasy
    place-sheet.tsx       # karta miejsca (dolny panel na telefonie, boczny na desktopie)
  hooks/
    use-places.ts         # useQuery → api.v1.places.$get
    use-place.ts          # useQuery → api.v1.places[":id"].$get, enabled gdy wybrano id
    use-selected-place.ts # id wybranego miejsca w URL (?p=kercelak), link da się udostępnić
  lib/
    route-to-geojson.ts   # Route → FeatureCollection<LineString> (odcinki) + <Point> (miejsca z numerem)
    visible-places.ts     # czysta funkcja: które miejsca pokazać (zainteresowania + MIN_PLACE_RICHNESS)
    map-style.ts          # stałe: styl podkładu, kolory wg kind/mode, środek i zoom startowy, MIN_PLACE_RICHNESS
  index.ts                # eksportuje SawaMap i typy propsów
```

`SawaMap` dostaje trasę i zainteresowania przez propsy (`route?: Route`, `interests: Interest[]`). Planer (`features/planner`) jej nie importuje, a strona w `app/` składa obie funkcje. Dzięki temu `/demo` użyje tej samej mapy ze stałą trasą.

Mapa ładuje się tylko w przeglądarce: `next/dynamic` z `ssr: false`, bo MapLibre potrzebuje `window` i WebGL. Next 16 w repo ma zmiany względem starszych wersji. Przed kodem przeczytaj właściwy przewodnik w `node_modules/next/dist/docs/` ([apps/web/AGENTS.md](../apps/web/AGENTS.md)).

## 6. Warstwy mapy

| Warstwa | Źródło | Wygląd | Interakcja |
|---|---|---|---|
| `places-circle` | `places` (GeoJSON z API, `promoteId: "id"`) | koło 6–8 px, kolor wg `kind` (9 typów → 5 kolorów, np. budynek/ulica, pomnik/tablica, mural, świątynia/cmentarz, miejsce/zdarzenie); większe przy wyższym `richness` | klik → `?p=<id>` i karta; kursor `pointer`; `feature-state: selected` = obwódka |
| `places-label` | `places` | nazwa od zoomu 16, `text-optional`, żeby etykiety się nie nakładały | — |
| `route-casing` + `route-line` | `route-legs` (z `route-to-geojson`) | linia 5 px z białą obwódką; kolor wg `mode` (tramwaj czerwony, autobus granatowy); przesiadka = przerwa i kropka | — |
| `route-places` | `route-places` | koło z numerem 1..n (kolejność `etaSec`), nad zwykłymi miejscami | klik → ta sama karta |
| pozycja startu | `origin` | pinezka „Ty” albo 42 Warsaw (brak GPS) | — |

**Które miejsca pokazujemy.** Decyduje jedna czysta funkcja `selectVisiblePlaces(places, { interests, minRichness })` w `lib/visible-places.ts`. Wynik idzie jako `data` do źródła `places`, a komponent wywołuje ją w `useMemo`.

- **Zainteresowania użytkownika:** lista z onboardingu (T-31), trzymana w URL (`?i=war_uprising,architecture`, [11 §4](11-zasady-pracy-i-kodu.md#frontend-appsweb-nextjs)). Strona czyta ją z URL i podaje mapie w propsie `interests`. Mapa pokazuje miejsca, które mają **co najmniej jedno** z wybranych zainteresowań (OR, jak `&&` w `places_in_bbox`). Pusta lista oznacza wszystkie miejsca. Około 82 miejsca bez żadnego zainteresowania znikają, gdy filtr jest aktywny.
- **Richness (decyzja Antka, 17.10):** pokazujemy wszystkie, także ubogie (`richness < 2`, rekordy `g-*` i `osm-*`). Próg siedzi w stałej `MIN_PLACE_RICHNESS = 0` w `map-style.ts`. Zmiana progu to zmiana jednej liczby, w UI nie ma przełącznika.
- **Miejsca na trasie** pokazujemy zawsze, niezależnie od filtra, bo wybrał je planer.

Filtrujemy w przeglądarce, nie w API. Mamy już wszystkie 326 punktów, więc zmiana zainteresowań działa od razu, bez nowego zapytania. Filtr warstwy MapLibre (`["in", key, ["get", "interests"]]`) odpuszczamy: tablice we właściwościach GeoJSON MapLibre potrafi zamieniać na tekst (np. w `queryRenderedFeatures`), a czystą funkcję łatwo przetestować. Gdy dane wyjdą poza 1 km, filtr przechodzi do parametru `interests` w `GET /v1/places`.


Gdy jest trasa: miejsca spoza trasy bledną (`circle-opacity` 0,35), a mapa robi `fitBounds` do trasy z marginesem pod dolny panel. Klastrowanie na razie pomijamy: 326 punktów w 1 km przy zoomie 15 jest czytelne. Wracamy do niego, jeśli test na telefonie pokaże tłok **[Z]**.

## 7. Karta miejsca (`place-sheet`)

- Telefon (375 px): dolny panel na ok. 45% wysokości, przeciągany, z przyciskiem zamknięcia. Desktop: panel z prawej, 380 px.
- Treść: nazwa, typ i okres, pierwsze zdjęcie z podpisem (autor, licencja), 3 fakty i rozwiń, źródła jako linki. Szkielet ładowania, dopóki `use-place` nie zwróci danych.
- Bez tekstów pisanych ręcznie: tylko pola z bazy (zasada 9 z [11 §1](11-zasady-pracy-i-kodu.md#1-dziesięć-reguł-na-kartce)). Opowieść Sawy (R4) dochodzi tu później jako osobna sekcja.

## 8. Odporność

- API nie odpowiada → mapa i podkład działają dalej, komunikat „Nie udało się pobrać miejsc” z przyciskiem ponowienia. Query robi 2 ponowienia.
- Podkład OpenFreeMap nie odpowiada → zapasowy styl z jednym kolorem tła, bo punkty i trasa nadal mają sens.
- **Zanim API będzie gotowe**, pracujemy na mocku w API, nie w web. Prosimy R2 o `GET /v1/places` z adapterem `fake` (fixture kilku miejsc), a R1 o mock trasy (T-16). Web od razu korzysta z prawdziwych typów `hc`.

## 9. Testy

- `route-to-geojson.ts`: kolejność `[lng, lat]`, numeracja miejsc wg `etaSec`, pusta trasa. Testy Vitest, obowiązkowe (czysta logika).
- `map-style.ts`: każdy `kind` z danych ma kolor (test na liście 9 typów).
- `visible-places.ts`: pusta lista zainteresowań = wszystkie miejsca; jedno pasujące zainteresowanie wystarcza (OR); miejsca bez zainteresowań odpadają przy aktywnym filtrze; próg 0 przepuszcza wszystkie, próg 2 odcina ubogie.
- Wygląd sprawdzamy ręcznie na telefonie (375 px) i w `/demo`, bez testów zrzutów.

## 10. Kolejność pracy

| # | Krok | Zależy od | Gotowe, gdy |
|---|---|---|---|
| 1 | `pnpm --filter @sawa/web add maplibre-gl react-map-gl @tanstack/react-query`, `QueryClientProvider` w `layout.tsx` | — | build przechodzi |
| 2 | `SawaMap` z podkładem, środek 42 Warsaw (`HACKATHON_VENUE`), zoom 15, pełny ekran na telefonie | 1 | mapa na `/` na telefonie |
| 3 | Warstwa miejsc na **lokalnym pliku** w `__fixtures__/` (5 miejsc w kształcie z `places_in_bbox`), tylko do czasu kroku 4 | 2 | kropki i kolory wg `kind` |
| 4 | `use-places` na `GET /v1/places` | R2: endpoint, T-63: `PlaceSummary` | 326 punktów z bazy |
| 5 | Klik → `?p=id` → `place-sheet` z `use-place` | R2: `GET /v1/places/:id` | karta z faktami i zdjęciem |
| 5a | `selectVisiblePlaces` + testy, prop `interests` z `?i=` w URL | lista kluczy w `packages/shared` (Z6) | zmiana `?i=` w adresie filtruje punkty |
| 6 | `route-to-geojson` + testy, `route-layer`, `fitBounds` | T-63: `Route`; R1: mock T-16 | trasa z mocka na mapie |
| 7 | Mobilka: dolny panel, 16 px marginesu, bez poziomego scrolla, test na 2 telefonach | 5, 6 | T-35 dla mapy |
| 8 | Pozycja „za oknem” w odtwarzaczu (postęp wzdłuż `lngLats` w czasie) | 6, T-33 | M2 w planie MVP |

Kroki 1–3 nie czekają na nikogo. Krok 3 to jedyny lokalny fixture w web i znika po kroku 4.

## 11. Do ustalenia

| Pytanie | Kto |
|---|---|
| Kiedy będzie `GET /v1/places` i `/v1/places/:id` w API (choćby z `fake`) | R2 (Jasiek) |
| Kiedy mock `POST /v1/routes/plan` (T-16) i czy `Leg.lngLats` to kształt po ulicach czy tylko przystanki | R1 (Szczepan) |
| Lista zainteresowań i ich etykiety PL (filtr na mapie) | R3 + R2 (Z6) |
