import { z } from "zod";
import type { VehicleReport } from "../../domain/vehicles/types";
import { AppError } from "../../lib/errors";
import type { VehiclePositionSource } from "../../services/ports";
import { warsawTimeToDate } from "./departures";

const ENDPOINT = "https://dane.um.warszawa.pl/api/action/get_ztm_lokalizacja_pojazdow";
const TIMEOUT_MS = 5_000;
const TYPES = [
  { type: 1, mode: "bus" },
  { type: 2, mode: "tram" },
] as const;

const PositionSchema = z.object({
  Lines: z.string(),
  Brigade: z.string(),
  VehicleNumber: z.string(),
  Lat: z.number(),
  Lon: z.number(),
  /** Warsaw local time, "2026-10-17 16:09:38". */
  Time: z.string(),
});
// Live API (checked with a token 17.10) answers with a bare array; the docs show { result: [...] }.
// Rows are parsed one by one, so a single malformed vehicle does not drop the whole city.
const ResponseSchema = z.union([z.array(z.unknown()), z.object({ result: z.array(z.unknown()) })]);

/** "2026-10-17 16:09:38" (Europe/Warsaw) → epoch ms; NaN when malformed. */
export function warsawDateTimeToMs(value: string): number {
  const [date, time] = value.split(" ");
  if (!date || !time || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return Number.NaN;
  return warsawTimeToDate(time, new Date(`${date}T12:00:00Z`)).getTime();
}

/** Parses one response of the positions endpoint; exported for tests. */
export function parseVehiclePositions(body: unknown, mode: "bus" | "tram"): VehicleReport[] {
  const parsed = ResponseSchema.safeParse(body);
  if (!parsed.success) return [];
  const rows = Array.isArray(parsed.data) ? parsed.data : parsed.data.result;
  return rows.flatMap((row) => {
    const r = PositionSchema.safeParse(row);
    if (!r.success) return [];
    const reportedAtMs = warsawDateTimeToMs(r.data.Time);
    if (Number.isNaN(reportedAtMs)) return [];
    return [
      {
        id: `${mode}-${r.data.VehicleNumber}`,
        line: r.data.Lines.trim(),
        mode,
        brigade: r.data.Brigade,
        position: { lat: r.data.Lat, lng: r.data.Lon },
        reportedAtMs,
      },
    ];
  });
}

/** Buses and trams from ZTM (dane.um.warszawa.pl, refreshed every 10 s). */
export function createWawVehiclePositionSource(token: string): VehiclePositionSource {
  async function fetchType(type: 1 | 2, mode: "bus" | "tram"): Promise<VehicleReport[]> {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: token, "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }).catch((err: unknown) => {
      throw new AppError("UPSTREAM_TIMEOUT", "ZTM vehicle positions did not answer", {
        cause: err,
      });
    });
    if (!res.ok) throw new AppError("UPSTREAM_ERROR", `ZTM vehicle positions: HTTP ${res.status}`);
    const reports = parseVehiclePositions(await res.json(), mode);
    // The portal answers 200 with { result: "false", error } on a bad token.
    if (!reports.length) throw new AppError("UPSTREAM_ERROR", "ZTM vehicle positions: no data");
    return reports;
  }

  return {
    async positions() {
      const all = await Promise.allSettled(TYPES.map((t) => fetchType(t.type, t.mode)));
      const ok = all.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
      if (!ok.length) {
        const failed = all.find((r) => r.status === "rejected");
        throw failed?.reason ?? new AppError("UPSTREAM_ERROR", "ZTM vehicle positions: no data");
      }
      return ok;
    },
  };
}
