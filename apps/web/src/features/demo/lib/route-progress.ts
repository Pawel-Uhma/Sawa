import { haversineM, type LatLng } from "@sawa/shared";
import type { MockStop } from "./mock-data";
import { etaSecOf } from "./ride-clock";

/*
 * Gdzie na trasie jest użytkownik, w metrach od startu wzdłuż `Leg.lngLats`. Miejsca leżą
 * do ok. 150 m od linii, więc sama odległość do miejsca bywa myląca: tramwaj mija je bokiem.
 * Odległość wzdłuż trasy mówi, ile zostało do kolejnego punktu, niezależnie od tego, jak daleko
 * od torów stoi budynek.
 */

/** Kolejna opowieść może ruszyć, gdy do jej punktu zostało tyle metrów trasy (ok. 25 s tramwajem). */
export const NEXT_STORY_M = 200;
/** GPS dalej od linii trasy nie mówi, gdzie na niej jesteś (inna ulica, zły odczyt). */
export const OFF_ROUTE_M = 300;
/** Tyle metrów za bieżącym punktem jeszcze szukamy użytkownika: zegar mógł wyprzedzić tramwaj. */
const BEHIND_M = 2000;

/** Linia trasy z odległością od startu do każdego wierzchołka (`cumM[i]`). */
export type RoutePath = { points: LatLng[]; cumM: number[] };

/** Trasa i to, gdzie na niej leży każdy punkt opowieści (`stopsM[i]`). */
export type RouteAlong = { path: RoutePath; stopsM: number[] };

export function pathOf(lngLats: readonly (readonly [number, number])[]): RoutePath {
  const points: LatLng[] = [];
  const cumM: number[] = [];
  for (const [lng, lat] of lngLats) {
    const point = { lat, lng };
    const prev = points[points.length - 1];
    const step = prev ? haversineM(prev, point) : 0;
    if (prev && step === 0) continue;
    points.push(point);
    cumM.push((cumM[cumM.length - 1] ?? 0) + step);
  }
  return { points, cumM };
}

export function pathLengthM(path: RoutePath): number {
  return path.cumM[path.cumM.length - 1] ?? 0;
}

/** Metry na stopień przy danej szerokości: na odcinkach trasy płaska Ziemia wystarcza. */
const M_PER_DEG = 111_320;

/**
 * Najbliższy punkt trasy w przedziale `[fromM, toM]` (metry od startu) i jak daleko od niego
 * jest `position`; null dla pustej trasy. Przedział trzyma pętlę w ryzach: jej koniec leży
 * przy starcie, a szukamy tylko tam, gdzie użytkownik może teraz być.
 */
export function projectOnPath(
  path: RoutePath,
  position: LatLng,
  fromM = 0,
  toM = Number.POSITIVE_INFINITY,
): { alongM: number; offM: number } | null {
  const { points, cumM } = path;
  const first = points[0];
  if (!first) return null;
  if (points.length === 1) return { alongM: 0, offM: haversineM(first, position) };
  const kx = M_PER_DEG * Math.cos((position.lat * Math.PI) / 180);
  let best: { alongM: number; offM: number } | null = null;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i] as LatLng;
    const b = points[i + 1] as LatLng;
    const startM = cumM[i] as number;
    const lengthM = (cumM[i + 1] as number) - startM;
    if (startM + lengthM < fromM || startM > toM) continue;
    // Metry względem `position`: x na wschód, y na północ.
    const ax = (a.lng - position.lng) * kx;
    const ay = (a.lat - position.lat) * M_PER_DEG;
    const dx = (b.lng - a.lng) * kx;
    const dy = (b.lat - a.lat) * M_PER_DEG;
    const lenSq = dx * dx + dy * dy;
    const raw = lenSq > 0 ? -(ax * dx + ay * dy) / lenSq : 0;
    const tMin = Math.max(0, (fromM - startM) / lengthM);
    const tMax = Math.min(1, (toM - startM) / lengthM);
    const t = Math.min(tMax, Math.max(tMin, raw));
    const offM = Math.hypot(ax + dx * t, ay + dy * t);
    if (!best || offM < best.offM) best = { alongM: startM + lengthM * t, offM };
  }
  return best;
}

/** Punkt trasy `m` metrów od startu (przed startem start, za końcem koniec). */
export function pointAtM(path: RoutePath, m: number): LatLng | null {
  const { points, cumM } = path;
  const first = points[0];
  if (!first) return null;
  for (let i = 0; i < points.length - 1; i++) {
    const endM = cumM[i + 1] as number;
    if (m > endM) continue;
    const startM = cumM[i] as number;
    const a = points[i] as LatLng;
    const b = points[i + 1] as LatLng;
    const t = Math.max(0, (m - startM) / (endM - startM));
    return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
  }
  return points[points.length - 1] ?? first;
}

/**
 * Cała trasa (odcinki po kolei) i gdzie na niej leży każde miejsce: najbliższy punkt jego
 * odcinka (`legIndex`), nie wcześniej niż poprzednie miejsce. Tak kolejność zostaje także na
 * pętli, gdzie ostatnie miejsce leży przy pierwszym.
 */
export function routeAlongOf(
  legs: readonly { lngLats: readonly (readonly [number, number])[] }[],
  places: readonly { position: LatLng; legIndex: number }[],
): RouteAlong {
  const lngLats = legs.flatMap((leg) => leg.lngLats);
  const path = pathOf(lngLats);
  // Metry od startu do każdego wierzchołka wejścia, jak w `path` (powtórzone punkty nic nie dodają).
  let m = 0;
  const rawCumM = lngLats.map(([lng, lat], i) => {
    const prev = lngLats[i - 1];
    if (prev) m += haversineM({ lat: prev[1], lng: prev[0] }, { lat, lng });
    return m;
  });
  // Gdzie zaczyna się i kończy każdy odcinek, w metrach od startu.
  let first = 0;
  const legSpansM = legs.map(({ lngLats: points }) => {
    const span = [rawCumM[first] ?? m, rawCumM[first + points.length - 1] ?? m] as const;
    first += points.length;
    return span;
  });
  let fromM = 0;
  const stopsM = places.map(({ position, legIndex }) => {
    const [legStartM, legEndM] = legSpansM[legIndex] ?? [0, m];
    const hit = projectOnPath(path, position, Math.max(fromM, legStartM), Math.max(fromM, legEndM));
    fromM = hit?.alongM ?? fromM;
    return fromM;
  });
  return { path, stopsM };
}

/**
 * Gdzie na trasie jest telefon, gdy Sawa mówi o punkcie `from`: szukamy od trochę przed nim
 * do kilku punktów dalej (`aheadIndex`). Null, gdy GPS jest daleko od linii.
 */
export function userAlongM(
  along: RouteAlong,
  position: LatLng,
  from: number,
  aheadIndex: number,
): number | null {
  const { stopsM } = along;
  const fromM = Math.max(0, (stopsM[from] ?? 0) - BEHIND_M);
  const toM = (stopsM[Math.min(aheadIndex, stopsM.length - 1)] ?? 0) + NEXT_STORY_M;
  const hit = projectOnPath(along.path, position, fromM, toM);
  return hit && hit.offM <= OFF_ROUTE_M ? hit.alongM : null;
}

/** Czy do punktu (metry `stopM`) zostało najwyżej `NEXT_STORY_M` trasy; minięty też się liczy. */
export function isApproaching(userM: number, stopM: number): boolean {
  return stopM - userM <= NEXT_STORY_M;
}

/**
 * Pozycja symulowana, gdy nie ma GPS (brak zgody, start spod 42 Warsaw, scena): po czasie
 * jazdy `rideSec` liniowo między punktami, które planer zna z czasem (`etaSec`) i miejscem
 * na trasie (`stopsM`). Od ostatniego punktu do końca trasy w czasie `totalSec`.
 */
export function simulatedAlongM(
  along: RouteAlong,
  stops: readonly Pick<MockStop, "etaMin" | "etaSec">[],
  rideSec: number,
  totalSec: number,
): number {
  const knots: [number, number][] = [[0, 0]];
  stops.forEach((stop, index) => {
    const sec = etaSecOf(stop);
    const m = along.stopsM[index];
    const [lastSec, lastM] = knots[knots.length - 1] as [number, number];
    if (m !== undefined && sec >= lastSec && m >= lastM) knots.push([sec, m]);
  });
  const [lastSec, lastM] = knots[knots.length - 1] as [number, number];
  const endM = pathLengthM(along.path);
  if (totalSec > lastSec && endM >= lastM) knots.push([totalSec, endM]);
  for (let i = 1; i < knots.length; i++) {
    const [sec, m] = knots[i] as [number, number];
    if (rideSec > sec) continue;
    const [prevSec, prevM] = knots[i - 1] as [number, number];
    const t = sec > prevSec ? Math.max(0, (rideSec - prevSec) / (sec - prevSec)) : 1;
    return prevM + (m - prevM) * t;
  }
  return (knots[knots.length - 1] as [number, number])[1];
}
