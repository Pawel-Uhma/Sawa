import type { VehicleHistory, VehicleReport } from "./types";

/**
 * Adds fresh reports to the per-vehicle history and drops samples older than `keepMs`.
 * Repeated reports (same timestamp) and reports older than the last sample are skipped:
 * ZTM keeps serving the last position of a vehicle that stopped reporting.
 */
export function appendReports(
  store: Map<string, VehicleHistory>,
  reports: VehicleReport[],
  nowMs: number,
  keepMs: number,
): void {
  for (const r of reports) {
    if (nowMs - r.reportedAtMs > keepMs) continue;
    let history = store.get(r.id);
    if (!history || history.line !== r.line) {
      // A vehicle switching lines starts a new history: old samples belong to another route.
      history = { id: r.id, line: r.line, mode: r.mode, brigade: r.brigade, samples: [] };
      store.set(r.id, history);
    }
    history.brigade = r.brigade;
    const last = history.samples.at(-1);
    if (!last || r.reportedAtMs > last.atMs) {
      history.samples.push({ atMs: r.reportedAtMs, position: r.position });
    }
  }
  for (const [id, history] of store) {
    const firstKept = history.samples.findIndex((s) => nowMs - s.atMs <= keepMs);
    if (firstKept < 0) store.delete(id);
    else if (firstKept > 0) history.samples.splice(0, firstKept);
  }
}
