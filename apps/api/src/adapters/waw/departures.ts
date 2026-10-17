import { z } from "zod";
import type { DepartureSource } from "../../services/ports";

const ENDPOINT = "https://dane.um.warszawa.pl/api/action/get_ztm_odjazdy_linii_z_przystanku";
const TIMEOUT_MS = 5_000;
const CACHE_TTL_MS = 60 * 60 * 1000;

const KeyValueSchema = z.object({ key: z.string(), value: z.string().nullable() });
// The portal wraps rows either as bare arrays or as { values: [...] }; accept both.
const RowSchema = z.union([z.array(KeyValueSchema), z.object({ values: z.array(KeyValueSchema) })]);
// Live API (checked with a token 17.10) answers with a bare array of rows; the docs show
// { result: [...] }. Accept both.
const ResponseSchema = z.union([z.array(RowSchema), z.object({ result: z.array(RowSchema) })]);

/** "06:46:00" (may exceed 24:00) on the Warsaw calendar day of `reference` → Date. */
export function warsawTimeToDate(time: string, reference: Date): Date {
  const [h = 0, m = 0, s = 0] = time.split(":").map(Number);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZoneName: "longOffset",
  }).formatToParts(reference);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const offset = get("timeZoneName").replace("GMT", "") || "+00:00";
  const midnight = new Date(`${get("year")}-${get("month")}-${get("day")}T00:00:00${offset}`);
  return new Date(midnight.getTime() + (h * 3600 + m * 60 + s) * 1000);
}

/** Parses the departure times of a response; exported for tests. */
export function parseDepartureTimes(body: unknown): string[] {
  const parsed = ResponseSchema.safeParse(body);
  if (!parsed.success) return [];
  const rows = Array.isArray(parsed.data) ? parsed.data : parsed.data.result;
  return rows.flatMap((row) => {
    const values = Array.isArray(row) ? row : row.values;
    const time = values.find((v) => v.key === "czas")?.value;
    return time ? [time] : [];
  });
}

/**
 * Real departures of a line from a platform (ZTM timetable on dane.um.warszawa.pl).
 * GTFS stop id "100101" = busstopId "1001" + busstopNr "01". Any failure → undefined.
 */
export function createWawDepartureSource(token: string | undefined): DepartureSource {
  const cache = new Map<string, { at: number; times: Promise<string[]> }>();

  // Shares the in-flight request, so parallel legs on one platform ask once.
  function times(stopId: string, line: string): Promise<string[]> {
    const key = `${stopId}|${line}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.times;
    const list = fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: token as string, "Content-Type": "application/json" },
      body: JSON.stringify({ busstopId: stopId.slice(0, 4), busstopNr: stopId.slice(4, 6), line }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }).then(async (res) => (res.ok ? parseDepartureTimes(await res.json()) : []));
    list.catch(() => cache.delete(key));
    cache.set(key, { at: Date.now(), times: list });
    return list;
  }

  return {
    async departures(stopId, line, day) {
      if (!token || !/^\d{6}$/.test(stopId)) return undefined;
      try {
        const list = await times(stopId, line);
        return list.length ? list.map((t) => warsawTimeToDate(t, day)) : undefined;
      } catch {
        return undefined;
      }
    },
  };
}
