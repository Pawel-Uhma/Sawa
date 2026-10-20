import { MAX_WAYPOINTS, type Waypoint } from "@sawa/shared";

/** Przystanek po drodze (#195): miejsce z karty, z nazwą do listy i pinezki na mapie. */
export type Stopover = Waypoint & { placeId: string; name: string };

export const canAddStopover = (list: readonly Stopover[]) => list.length < MAX_WAYPOINTS;

/** Dodaje miejsce na koniec listy albo je z niej zdejmuje; ponad limit nic nie dodaje. */
export function toggleStopover(list: readonly Stopover[], stop: Stopover): Stopover[] {
  if (list.some((s) => s.placeId === stop.placeId))
    return list.filter((s) => s.placeId !== stop.placeId);
  return canAddStopover(list) ? [...list, stop] : [...list];
}

/** Przesuwa przystanek o `by` miejsc (-1 wyżej, 1 niżej); poza listą nic nie zmienia. */
export function moveStopover(list: readonly Stopover[], index: number, by: number): Stopover[] {
  const to = index + by;
  const moved = list[index];
  if (!moved || to < 0 || to >= list.length) return [...list];
  const next = list.filter((_, i) => i !== index);
  next.splice(to, 0, moved);
  return next;
}

/** Do planera: tylko pola kontraktu. */
export const toWaypoints = (list: readonly Stopover[]): Waypoint[] =>
  list.map(({ lat, lng, placeId, name }) => ({ lat, lng, placeId, name }));
