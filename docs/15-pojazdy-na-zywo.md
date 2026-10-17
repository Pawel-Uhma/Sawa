# Pojazdy na żywo na mapie

Stan: 17.10, ok. 16:30 (Jasiek z agentem, gałąź `r1/live-vehicles`). Backend i kontrakt gotowe, frontend czeka na R3 (Paweł).

Na mapie trasy pokazujemy pojazd, którym jedzie użytkownik, i po jednym pojeździe tej samej linii przed nim i za nim (na wypadek opóźnienia albo przyspieszenia). Pojazdy jadą płynnie, a nie skaczą co 10 s. Dane: zbiór miasta **„Lokalizacja pojazdów komunikacji miejskiej”** z dane.um.warszawa.pl (ZTM, CC BY), więc to też zbiór miasta na scenę (T-95).

## Jak to działa

1. API co 10 s pobiera pozycje wszystkich autobusów i tramwajów z ZTM (`adapters/waw/vehicle-positions.ts`) i trzyma historię każdego pojazdu z ostatnich 35 min (`domain/vehicles/history.ts`).
2. Pozycje rzutuje na kształt linii z GTFS (ten sam, co `Leg.lngLats`), czyli „ile metrów od pętli” (`domain/vehicles/along.ts`). Kierunek rozpoznaje po ruchu z ostatnich 3 min; pojazdy jadące w drugą stronę odpadają. Na żywych danych 17.10 na kształt trafiło 100% raportów linii 136, 9, 17, 175.
3. **Prędkość z poprzednika** (`domain/vehicles/predict.ts`): dla pojazdu w punkcie X bierzemy pojazd tej samej linii przed nim, który już przejechał X, i kopiujemy, jak przejechał dalszy odcinek, z postojami. Jeśli 136 minutę temu stał 2 min w korku na Puławskiej, następny 136 też tam postoi 2 min. Dalej niż poprzednik (albo bez poprzednika) jedzie z prędkością z rozkładu GTFS. Pojazd stojący na pierwszej pętli czeka (`hold`).
4. Wybór pojazdów (`domain/vehicles/select.ts`): `ride` to pojazd, który będzie (albo był) na przystanku wsiadania najbliżej planowego `Leg.departAt`; pojazd, który już odjechał, gdy użytkownik jeszcze czeka, nie może być `ride`. `ahead` i `behind` to jego sąsiedzi na linii.
5. Odpowiedź ma dla każdego pojazdu **tor**: punkty `[lng, lat, czasMs]` od ostatniego raportu do ok. 2 min w przód, po kształcie ulicy. Przeglądarka w każdej klatce liczy pozycję na torze dla `Date.now()`, więc ruch jest płynny między odświeżeniami.

### Pomiar na żywych danych (17.10, 16:24–16:37)

Linie 136, 175, 180, 523, 128, 9, 17, 4, 10, 33. Błąd to odległość wzdłuż trasy między prognozą a następnym raportem pojazdu, mediana (w nawiasie 80. percentyl). Porównanie dotyczy tych samych pojazdów (tych, które miały poprzednika z historią):

| Horyzont | Z poprzednika | Z rozkładu | Bez prognozy (stoi) |
|---|---|---|---|
| 30 s | **32 m** (120) | 93 m (160) | 128 m (262) |
| 60 s | **50 m** (164) | 114 m (233) | 306 m (427) |
| 90 s | **71 m** (163) | 143 m (250) | 455 m (605) |

Prognoza z poprzednika jest ok. 2–3 razy dokładniejsza od rozkładu. Po nowym raporcie pojazd przesuwa się więc zwykle o kilkadziesiąt metrów, a przejście 0,8 s (niżej) to wygładza.

## Kontrakt

`POST /v1/vehicles/track` (schematy w `packages/shared/src/schemas/vehicles.ts`).

Zapytanie: `{ legs: [{ legIndex, line, fromStopId, toStopId, departAt }] }`. Robi je `trackRequestFromRoute(route)` z `@sawa/shared`: bierze odcinki tramwajem i autobusem, pomija piesze (`mode: "walk"`), `legIndex` to numer odcinka w `Route.legs`. Dla trasy całej pieszo zwraca `undefined` (nie pytaj).

Odpowiedź `TrackVehiclesResponse`:

| Pole | Znaczenie |
|---|---|
| `live` | `false`: API nie ma `WAW_TOKEN`, pojazdów nie będzie |
| `stale` | ZTM nie odpowiedział, pozycje z ostatniego udanego pobrania |
| `refreshSec` | co ile pytać ponownie (10) |
| `legs[i].vehicles[]` | od najdalej z przodu do najdalej z tyłu; puste, gdy nie wiadomo, który to pojazd (patrz Ograniczenia) |
| `legs[i].unknownLeg` | linii/przystanków nie ma w grafie GTFS |
| `vehicle.id` | stały między odpowiedziami (`bus-5855`, `tram-3187`), klucz do animacji |
| `vehicle.mode` | `bus` / `tram`: **po tym wybierasz ikonę** |
| `vehicle.role` | `ride` (nasz), `ahead`, `behind` |
| `vehicle.boardAt` | kiedy będzie (był) na przystanku wsiadania, ISO; np. „Twój 136 za 3 min” |
| `vehicle.speedSource` | `leader` (z poprzednika), `schedule` (z rozkładu), `hold` (stoi na pętli) |
| `vehicle.track` | `[lng, lat, atMs][]` do animacji |
| `attribution` | podpis danych, pokazać przy mapie (ZTM CC BY + GTFS) |

## Frontend: co ma zrobić Paweł (R3)

Wszystko w `apps/web/src/features/map/` (Twój obszar). Backend niczego więcej nie potrzebuje.

**1. Hook z odświeżaniem co 10 s** (`hooks/use-live-vehicles.ts`):

```ts
import {
  type Route,
  trackRequestFromRoute,
  type TrackVehiclesRequest,
  TrackVehiclesResponseSchema,
} from "@sawa/shared";
import { useQuery } from "@tanstack/react-query";
import { API_TIMEOUT_MS, api } from "@/lib/api";

export function useLiveVehicles(route: Route | undefined) {
  const body = route ? trackRequestFromRoute(route) : undefined;
  return useQuery({
    queryKey: ["vehicles", route?.id],
    enabled: Boolean(body),
    queryFn: async () => {
      const res = await api.v1.vehicles.track.$post(
        { json: body as TrackVehiclesRequest },
        { init: { signal: AbortSignal.timeout(API_TIMEOUT_MS) } },
      );
      if (!res.ok) throw new Error(`POST /v1/vehicles/track: ${res.status}`);
      return TrackVehiclesResponseSchema.parse(await res.json());
    },
    refetchInterval: 10_000,
    placeholderData: (prev) => prev, // pojazdy nie znikają w trakcie odświeżania
  });
}
```

Wystarczy pytać o bieżący odcinek (`legs` z jednym elementem); cała trasa też działa.

**2. Ikony: inna dla tramwaju i autobusu.** Pliki np. `apps/web/public/icons/vehicle-tram.png` i `vehicle-bus.png` (PNG ok. 64×64 px, rysowane „przodem do góry”, bo obracamy je kierunkiem jazdy; SVG trzeba najpierw narysować do `<img>`). Rejestracja w MapLibre raz po załadowaniu stylu:

```ts
const { current: mapRef } = useMap();
useEffect(() => {
  const map = mapRef?.getMap();
  if (!map) return;
  for (const mode of ["tram", "bus"] as const) {
    const id = `vehicle-${mode}`;
    if (map.hasImage(id)) continue;
    map.loadImage(`/icons/${id}.png`).then(({ data }) => {
      if (!map.hasImage(id)) map.addImage(id, data, { pixelRatio: 2 });
    });
  }
}, [mapRef]);
```

Warstwa symboli wybiera ikonę po `mode`, obraca po `bearingDeg` i wyróżnia `ride`:

```tsx
<Source id="live-vehicles" type="geojson" data={EMPTY_FC}>
  <Layer
    id="live-vehicles"
    type="symbol"
    layout={{
      "icon-image": ["match", ["get", "mode"], "tram", "vehicle-tram", "vehicle-bus"],
      "icon-size": ["case", ["==", ["get", "role"], "ride"], 1, 0.75],
      "icon-rotate": ["get", "bearingDeg"],
      "icon-rotation-alignment": "map",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    }}
    paint={{ "icon-opacity": ["case", ["==", ["get", "role"], "ride"], 1, 0.6] }}
  />
</Source>
```

Jeśli ikony mają być „zawsze prosto” (bez obracania), usuń `icon-rotate` i dodaj osobną małą strzałkę kierunku.

**3. Płynny ruch: pętla `requestAnimationFrame`, nie stan Reacta.** Co klatkę licz pozycje funkcją `positionOnTrack(track, Date.now())` z `@sawa/shared` i wstawiaj GeoJSON prosto do źródła mapy (`map.getSource("live-vehicles").setData(fc)`). `setState` 60 razy na sekundę zabije wydajność na telefonie.

Gdy przychodzi nowa odpowiedź, tor się zmienia i pojazd mógłby przeskoczyć o kilkadziesiąt metrów. Żeby nie szarpało, przez ok. 0,8 s przejdź od pozycji wyświetlanej do nowej (przerywalnie, w duchu `apple-design`):

```ts
type Shown = { lngLat: [number, number]; from?: [number, number]; since: number };
const BLEND_MS = 800;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

// przy nowej odpowiedzi: dla każdego vehicle.id zapamiętaj from = aktualnie wyświetlana pozycja, since = now
// w każdej klatce:
const target = positionOnTrack(vehicle.track, now);
const k = shown.from ? Math.min(1, (now - shown.since) / BLEND_MS) : 1;
const lngLat = shown.from
  ? lerp(shown.from, target.lngLat, easeOut(k)) // lerp: liniowo po lng i lat
  : target.lngLat;
```

Nowy pojazd (nowe `id`) pojawia się z fade-in (`icon-opacity` przez feature-state albo osobna właściwość), znikający z fade-out. Przy `prefers-reduced-motion`: bez przejścia, pozycja aktualizowana raz na sekundę zamiast co klatkę.

**4. Puste i błędy:** `live: false` albo puste `vehicles`: warstwa pusta, bez komunikatu (trasa działa i bez pojazdów). `stale: true`: można przygasić ikony. Pokaż `attribution` w podpisie mapy.

## Ograniczenia

- **Zimny start.** Kierunek pojazdu widać po dwóch raportach, więc po starcie API pierwsze ok. 20 s nie ma pojazdów. Prędkość z poprzednika wymaga, żeby API zbierało pozycje od kilku minut (tyle, ile wynosi odstęp między pojazdami); wcześniej jest `schedule`. API pobiera pozycje 20 min po starcie i 20 min po każdym zapytaniu. **Na dzień demo ustawić `VEHICLES_ALWAYS_ON=1` na Railway**, wtedy pobiera cały czas.
- **`WAW_TOKEN` musi być na Railway** (T-17). Bez niego `live: false`.
- **Odjazd daleko w przyszłości.** Pojazd, który ma przyjechać za 40 min, często jeszcze jedzie w drugą stronę albo stoi w zajezdni. Gdy żaden pojazd nie pasuje do `departAt` (tolerancja: większa z 15 min i dwóch odstępów linii), lista jest pusta.
- Graf GTFS ma jeden wariant trasy na linię i kierunek. Pojazd na innym wariancie liczy się, dopóki jest na wspólnym odcinku; po zjeździe na swój wariant znika.
- Stojący pojazd w kilku pierwszych sekundach może pasować do obu kierunków; odpada, gdy jedzie do przodu w innym wariancie tej samej linii.
- Historia jest w pamięci API: restart Railway ją czyści (patrz zimny start).
