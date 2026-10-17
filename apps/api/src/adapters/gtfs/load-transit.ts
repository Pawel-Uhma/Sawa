import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { TransitGraphSchema } from "@sawa/shared";
import { createNetwork } from "../../domain/routing/network";
import type { TransitData } from "../../services/ports";

/** Reads the graph built by scripts/transit/build-graph.ts. */
export function loadTransitData(path: string | URL): TransitData {
  const graph = TransitGraphSchema.parse(
    JSON.parse(gunzipSync(readFileSync(path)).toString("utf8")),
  );
  const network = createNetwork(
    graph.stops.map((s) => ({
      id: s.id,
      groupId: s.groupId,
      name: s.name,
      position: { lat: s.lat, lng: s.lng },
    })),
    graph.patterns.map((p) => ({
      id: p.id,
      line: p.line,
      mode: p.mode,
      headsign: p.headsign,
      headwaySec: p.headwaySec,
      stops: p.stops.map(([stopId, atSec, alongM]) => ({ stopId, atSec, alongM })),
      lngLats: p.lngLats,
    })),
  );
  return { network, serviceDate: graph.serviceDate, attribution: graph.attribution };
}
