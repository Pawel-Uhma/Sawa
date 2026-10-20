/** A candidate route: its value (higher is better) and what makes it what it is. */
export type RideCandidate<T> = {
  item: T;
  value: number;
  /** Stable id, for a deterministic order and the seeded jitter. */
  key: string;
  placeIds: readonly string[];
  lines: readonly string[];
};

export type DiverseOptions = {
  count: number;
  /** Another seed reorders the candidates a little; the same seed gives the same pick. */
  seed?: number;
  /** Only this many best candidates are considered. */
  poolSize: number;
  /** How much similarity to a route already picked costs, on the 0..1 value scale. */
  similarityWeight: number;
  /** Share of the similarity that comes from the places (the rest from the lines). */
  placeShare: number;
  /**
   * Candidates sharing at least this share of places (Jaccard) with a picked one are near-copies
   * and never picked: lines running down the same street pass the same places.
   */
  maxPlaceOverlap: number;
  /** With a seed, each candidate's value moves by up to this much (0..1 scale). */
  seedJitter: number;
};

export const DEFAULT_DIVERSE_OPTIONS: Omit<DiverseOptions, "count" | "seed"> = {
  poolSize: 40,
  similarityWeight: 1,
  placeShare: 0.7,
  maxPlaceOverlap: 0.5,
  seedJitter: 0.6,
};

/** |A ∩ B| / |A ∪ B|; two empty sets count as the same. */
export function jaccard(a: readonly string[], b: readonly string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  let shared = 0;
  for (const x of setA) if (setB.has(x)) shared++;
  return shared / (setA.size + setB.size - shared);
}

/** A number in [0, 1) from the seed and a key (FNV-1a, then a murmur finaliser). */
export function seededUnit(seed: number, key: string): number {
  let h = 0x811c9dc5 ^ seed;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 2 ** 32;
}

/**
 * Up to `count` routes that differ (#197), greedy maximal marginal relevance: each next one
 * has the best value (scaled to 0..1 in the pool) minus `similarityWeight` × its highest
 * similarity (Jaccard of places and of lines) to the ones already picked; near-copies are
 * skipped, so fewer than `count` may come back. Without a seed the
 * first is the best candidate, so one route is the same as before.
 */
export function pickDiverse<T>(
  candidates: readonly RideCandidate<T>[],
  options: Pick<DiverseOptions, "count" | "seed"> &
    Partial<DiverseOptions> & {
      /** Picked before (another search): new picks differ from these too, and only new come back. */
      picked?: readonly RideCandidate<T>[];
    },
): RideCandidate<T>[] {
  const opts = { ...DEFAULT_DIVERSE_OPTIONS, ...options };
  // Stable: equal values keep the caller's order (the planner's own tie-breaks).
  const sorted = [...candidates].sort((a, b) => b.value - a.value).slice(0, opts.poolSize);
  if (sorted.length === 0 || opts.count <= 0) return [];
  const max = sorted[0]?.value ?? 0;
  const min = sorted[sorted.length - 1]?.value ?? 0;
  const span = max - min || 1;
  const { seed } = opts;
  const base = new Map(
    sorted.map((c) => [
      c,
      (c.value - min) / span + (seed === undefined ? 0 : opts.seedJitter * seededUnit(seed, c.key)),
    ]),
  );
  const similarity = (a: RideCandidate<T>, b: RideCandidate<T>) =>
    opts.placeShare * jaccard(a.placeIds, b.placeIds) +
    (1 - opts.placeShare) * jaccard(a.lines, b.lines);

  const before = opts.picked ?? [];
  const picked: RideCandidate<T>[] = [...before];
  let left = sorted;
  while (picked.length - before.length < opts.count && left.length > 0) {
    let best: RideCandidate<T> | undefined;
    let bestValue = Number.NEGATIVE_INFINITY;
    for (const c of left) {
      if (picked.some((p) => jaccard(c.placeIds, p.placeIds) >= opts.maxPlaceOverlap)) continue;
      const closest = Math.max(0, ...picked.map((p) => similarity(c, p)));
      const v = (base.get(c) ?? 0) - opts.similarityWeight * closest;
      if (v > bestValue) {
        best = c;
        bestValue = v;
      }
    }
    if (!best) break;
    picked.push(best);
    left = left.filter((c) => c !== best);
  }
  return picked.slice(before.length);
}
