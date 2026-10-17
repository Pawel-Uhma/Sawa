export type BoardingCandidate = {
  id: string;
  /** Where it is now along the pattern. */
  alongNowM: number;
  /** When it is (or was) at the boarding stop; undefined when unknown. */
  boardAtMs?: number;
};

export type BoardingPick = { ride: string; ahead?: string; behind?: string };

/**
 * The vehicle the rider boards is the one at the boarding stop closest to the planned
 * departure (a late bus is still the rider's bus); `ahead` and `behind` are its neighbours
 * on the line, in case it overtakes or falls back. No vehicle within `toleranceMs` → none.
 * Vehicles that left the stop before `notBeforeMs` cannot be boarded any more (the rider
 * still waits there), so they are only neighbours.
 */
export function pickAroundBoarding(
  candidates: BoardingCandidate[],
  departAtMs: number,
  toleranceMs: number,
  notBeforeMs = Number.NEGATIVE_INFINITY,
): BoardingPick | undefined {
  let ride: BoardingCandidate | undefined;
  for (const c of candidates) {
    if (c.boardAtMs === undefined || c.boardAtMs < notBeforeMs) continue;
    const diff = Math.abs(c.boardAtMs - departAtMs);
    if (diff > toleranceMs) continue;
    if (!ride || diff < Math.abs((ride.boardAtMs as number) - departAtMs)) ride = c;
  }
  if (!ride) return undefined;
  const chosen = ride;
  const ahead = candidates
    .filter((c) => c.alongNowM > chosen.alongNowM && c.id !== chosen.id)
    .sort((a, b) => a.alongNowM - b.alongNowM)[0];
  const behind = candidates
    .filter((c) => c.alongNowM <= chosen.alongNowM && c.id !== chosen.id)
    .sort((a, b) => b.alongNowM - a.alongNowM)[0];
  return { ride: chosen.id, ahead: ahead?.id, behind: behind?.id };
}
