// In-memory PlacesRepository for tests and offline demo. Data: 5 real places from Supabase.

import type { LatLng } from "@sawa/shared";
import type { Place, PlaceAlongLine, PlaceSummary } from "../../domain/place";
import type { PlacesRepository } from "../../services/ports";
import detailSample from "./__fixtures__/supabase-place-detail-sample.json";
import { toPlace } from "./place-mappers";

const M_PER_DEG_LAT = 111_320;

export function createFakePlacesRepository(
  places: Place[] = detailSample.map((d) => toPlace(d)).filter((p) => p !== null),
): PlacesRepository {
  const matches = (p: Place, interests?: string[]) =>
    !interests?.length || p.interests.some((i) => interests.includes(i));

  return {
    async listInBBox(bbox, interests) {
      return places
        .filter(
          ({ position: { lat, lng } }) =>
            lng >= bbox.minLng && lng <= bbox.maxLng && lat >= bbox.minLat && lat <= bbox.maxLat,
        )
        .filter((p) => matches(p, interests))
        .sort((a, b) => b.richness - a.richness)
        .map(toSummary);
    },

    async getById(id) {
      return places.find((p) => p.id === id) ?? null;
    },

    async listNearLine(line, radiusM, interests) {
      return places
        .filter((p) => matches(p, interests))
        .map((p): PlaceAlongLine => ({ ...toSummary(p), ...locateOnLine(p.position, line) }))
        .filter((p) => p.distanceM <= radiusM)
        .sort((a, b) => a.fraction - b.fraction);
    },
  };
}

function toSummary({
  id,
  name,
  kind,
  subkind,
  interests,
  position,
  richness,
}: Place): PlaceSummary {
  return { id, name, kind, subkind, interests, position, richness };
}

/** Equirectangular approximation: good to well under 1 m at city scale. */
function locateOnLine(point: LatLng, line: LatLng[]): { distanceM: number; fraction: number } {
  const mPerDegLng = M_PER_DEG_LAT * Math.cos((point.lat * Math.PI) / 180);
  const xy = (p: LatLng) => ({ x: p.lng * mPerDegLng, y: p.lat * M_PER_DEG_LAT });
  const pt = xy(point);
  const pts = line.map(xy);
  const lengths = pts.slice(1).map((b, i) => Math.hypot(b.x - pts[i].x, b.y - pts[i].y));
  const total = lengths.reduce((s, l) => s + l, 0);

  let best = { distanceM: Number.POSITIVE_INFINITY, alongM: 0 };
  let startM = 0;
  for (const [i, len] of lengths.entries()) {
    const a = pts[i];
    const b = pts[i + 1];
    const t =
      len === 0 ? 0 : clamp(((pt.x - a.x) * (b.x - a.x) + (pt.y - a.y) * (b.y - a.y)) / len ** 2);
    const d = Math.hypot(pt.x - (a.x + t * (b.x - a.x)), pt.y - (a.y + t * (b.y - a.y)));
    if (d < best.distanceM) best = { distanceM: d, alongM: startM + t * len };
    startM += len;
  }
  return { distanceM: best.distanceM, fraction: total === 0 ? 0 : best.alongM / total };
}

const clamp = (t: number) => Math.min(1, Math.max(0, t));
