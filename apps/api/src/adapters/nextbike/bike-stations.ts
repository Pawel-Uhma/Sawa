import type { BikeStation } from "@sawa/shared";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import type { BikeStationSource } from "../../services/ports";

/** Veturilo's GBFS feeds (Nextbike, CC0), Polish names. */
export const VETURILO_GBFS_URL = "https://gbfs.nextbike.net/maps/gbfs/v2/nextbike_vw/pl";
const TIMEOUT_MS = 5_000;
/** Station names and places change rarely. */
const INFORMATION_TTL_MS = 24 * 60 * 60_000;
/** Bikes and docks change all the time; the feed itself says 60 s. */
const STATUS_TTL_MS = 60_000;

const InformationSchema = z.object({
  data: z.object({
    stations: z.array(
      z.object({
        station_id: z.string(),
        name: z.string(),
        lat: z.number(),
        lon: z.number(),
        capacity: z.number().int().nonnegative().optional(),
      }),
    ),
  }),
});

const StatusSchema = z.object({
  data: z.object({
    stations: z.array(
      z.object({
        station_id: z.string(),
        num_bikes_available: z.number().int().nonnegative(),
        num_docks_available: z.number().int().nonnegative().optional(),
        is_installed: z.boolean().optional(),
        is_renting: z.boolean().optional(),
        is_returning: z.boolean().optional(),
      }),
    ),
  }),
});

/**
 * GBFS `station_information` + `station_status` → stations with live counts; exported for
 * tests. A station that does not rent has no bikes for us, one that does not take returns no
 * docks; uninstalled ones and ones without a status are left out.
 */
export function parseStations(information: unknown, status: unknown): BikeStation[] | undefined {
  const info = InformationSchema.safeParse(information);
  const live = StatusSchema.safeParse(status);
  if (!info.success || !live.success) return undefined;
  const byId = new Map(live.data.data.stations.map((s) => [s.station_id, s]));
  return info.data.data.stations.flatMap((s) => {
    const st = byId.get(s.station_id);
    if (!st || st.is_installed === false) return [];
    return [
      {
        id: s.station_id,
        name: s.name,
        position: { lat: s.lat, lng: s.lon },
        bikesAvailable: st.is_renting === false ? 0 : st.num_bikes_available,
        docksAvailable: st.is_returning === false ? 0 : (st.num_docks_available ?? 0),
        ...(s.capacity === undefined ? {} : { capacity: s.capacity }),
      },
    ];
  });
}

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export type NextbikeOptions = {
  baseUrl?: string;
  fetch?: Fetch;
  clock?: () => number;
  logger?: { warn(obj: object, msg: string): void };
};

/**
 * Veturilo stations from the Nextbike GBFS feed, cached (information a day, status a minute).
 * One request at a time per feed. When a refresh fails the last stations are served with
 * `stale: true`; with nothing cached it throws AppError.
 */
export function createNextbikeStationSource(opts: NextbikeOptions = {}): BikeStationSource {
  const baseUrl = opts.baseUrl ?? VETURILO_GBFS_URL;
  const doFetch: Fetch = opts.fetch ?? ((url, init) => fetch(url, init));
  const clock = opts.clock ?? Date.now;
  let information: { body: unknown; at: number } | undefined;
  let last: { stations: BikeStation[]; at: number } | undefined;
  let loading: Promise<BikeStation[]> | undefined;

  async function getJson(feed: string): Promise<unknown> {
    const res = await doFetch(`${baseUrl}/${feed}.json`, {
      headers: { "User-Agent": "sawa-api (Warsaw Open Data Hackathon)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new AppError("UPSTREAM_ERROR", `GBFS ${feed}: ${res.status}`);
    return res.json();
  }

  async function load(): Promise<BikeStation[]> {
    if (!information || clock() - information.at >= INFORMATION_TTL_MS) {
      information = { body: await getJson("station_information"), at: clock() };
    }
    const stations = parseStations(information.body, await getJson("station_status"));
    if (!stations) throw new AppError("UPSTREAM_ERROR", "GBFS: unexpected answer");
    last = { stations, at: clock() };
    return stations;
  }

  return {
    async stations() {
      if (last && clock() - last.at < STATUS_TTL_MS)
        return { stations: last.stations, stale: false };
      loading ??= load().finally(() => {
        loading = undefined;
      });
      try {
        return { stations: await loading, stale: false };
      } catch (err) {
        opts.logger?.warn({ err: String(err) }, "veturilo stations failed");
        if (last) return { stations: last.stations, stale: true };
        throw err instanceof AppError
          ? err
          : new AppError("UPSTREAM_TIMEOUT", "Veturilo stations unavailable", { cause: err });
      }
    },
  };
}
