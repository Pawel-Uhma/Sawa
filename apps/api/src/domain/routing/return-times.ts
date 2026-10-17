import type { Network, PatternStop } from "./types";

/**
 * Seconds needed to get from each stop group back to one of `targetGroups`, using the same
 * model as the search (half headway wait + transfer per leg, median ride times).
 * Reverse Dijkstra over stop groups; groups that cannot get back are missing from the map.
 */
export function computeReturnTimes(
  network: Network,
  targetGroups: ReadonlySet<string>,
  transferSec: number,
): Map<string, number> {
  const best = new Map<string, number>();
  const queue = new MinQueue();
  for (const group of targetGroups) {
    best.set(group, 0);
    queue.push(group, 0);
  }

  for (let item = queue.pop(); item; item = queue.pop()) {
    const [group, cost] = item;
    if (cost > (best.get(group) ?? Number.POSITIVE_INFINITY)) continue;
    // Every leg that ends at this group: board earlier on the same pattern.
    for (const visit of network.visitsByGroup.get(group) ?? []) {
      const pattern = network.patterns.get(visit.patternId);
      if (!pattern) continue;
      const alight = pattern.stops[visit.index] as PatternStop;
      for (let i = 0; i < visit.index; i++) {
        const board = pattern.stops[i] as PatternStop;
        const boardGroup = network.stops.get(board.stopId)?.groupId;
        if (!boardGroup) continue;
        const candidate = cost + alight.atSec - board.atSec + pattern.headwaySec / 2 + transferSec;
        if (candidate < (best.get(boardGroup) ?? Number.POSITIVE_INFINITY)) {
          best.set(boardGroup, candidate);
          queue.push(boardGroup, candidate);
        }
      }
    }
  }
  return best;
}

/** Small binary heap keyed by cost. */
class MinQueue {
  private items: [string, number][] = [];

  push(key: string, cost: number) {
    const items = this.items;
    items.push([key, cost]);
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if ((items[parent] as [string, number])[1] <= cost) break;
      items[i] = items[parent] as [string, number];
      i = parent;
    }
    items[i] = [key, cost];
  }

  pop(): [string, number] | undefined {
    const items = this.items;
    const top = items[0];
    const last = items.pop();
    if (!top || !last || items.length === 0) return top;
    let i = 0;
    for (;;) {
      const left = 2 * i + 1;
      const right = left + 1;
      let smallest = i;
      const costAt = (k: number) => (k === i ? last[1] : (items[k] as [string, number])[1]);
      if (left < items.length && costAt(left) < costAt(smallest)) smallest = left;
      if (right < items.length && costAt(right) < costAt(smallest)) smallest = right;
      if (smallest === i) break;
      items[i] = items[smallest] as [string, number];
      i = smallest;
    }
    items[i] = last;
    return top;
  }
}
