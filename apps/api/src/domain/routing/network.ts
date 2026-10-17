import type { Network, NetworkStop, Pattern, StopVisit } from "./types";

export function createNetwork(stops: NetworkStop[], patterns: Pattern[]): Network {
  const stopsById = new Map(stops.map((s) => [s.id, s]));
  const visitsByGroup = new Map<string, StopVisit[]>();
  for (const pattern of patterns) {
    pattern.stops.forEach((stop, index) => {
      const groupId = stopsById.get(stop.stopId)?.groupId;
      if (!groupId) return;
      const visits = visitsByGroup.get(groupId) ?? [];
      visits.push({ patternId: pattern.id, index });
      visitsByGroup.set(groupId, visits);
    });
  }
  return { patterns: new Map(patterns.map((p) => [p.id, p])), stops: stopsById, visitsByGroup };
}
