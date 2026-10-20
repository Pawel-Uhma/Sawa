import { describe, expect, it } from "vitest";
import type { MockStop } from "./mock-data";
import { ARRIVE_M } from "./ride-clock";
import { reachedIndex } from "./ride-sync";
import { NEXT_STORY_M, routeAlongOf } from "./route-progress";
import { afterStory } from "./story-advance";

// Punkty co ok. 1 km na wschód wzdłuż jednej szerokości geograficznej.
const stop = (id: string, lng: number): MockStop => ({
  id,
  name: id,
  interest: "historical",
  line: "22",
  coord: [lng, 52.23],
  along: 0,
  etaMin: 0,
});
const stops = [stop("a", 21.0), stop("b", 21.015), stop("c", 21.03), stop("d", 21.045)];
const at = (lng: number) => ({ lat: 52.23, lng });

describe("reachedIndex", () => {
  it("finds the stop the rider is at, after the current one", () => {
    expect(reachedIndex(stops, at(21.015), 0)).toBe(1);
    expect(reachedIndex(stops, at(21.03), 0)).toBe(2);
  });

  it("ignores the current stop, earlier ones and stops too far away", () => {
    expect(reachedIndex(stops, at(21.0), 0)).toBe(-1);
    expect(reachedIndex(stops, at(21.015), 1)).toBe(-1);
    expect(reachedIndex(stops, at(21.0075), 0)).toBe(-1);
  });

  it("counts a stop just inside the radius", () => {
    const deg = (ARRIVE_M - 20) / (111_320 * Math.cos((52.23 * Math.PI) / 180));
    expect(reachedIndex(stops, at(21.015 - deg), 0)).toBe(1);
  });

  describe("with the route line", () => {
    // Miejsca 300 m na północ od linii: GPS w tramwaju nigdy nie jest w promieniu ARRIVE_M.
    const off = (s: MockStop): MockStop => ({ ...s, coord: [s.coord[0], 52.23 + 300 / 111_320] });
    const aside = stops.map(off);
    const along = routeAlongOf(
      [{ lngLats: [[20.99, 52.23] as const, [21.06, 52.23] as const] }],
      aside.map(({ coord: [lng, lat] }) => ({ position: { lat, lng }, legIndex: 0 })),
    );
    const metres = (m: number) => m / (111_320 * Math.cos((52.23 * Math.PI) / 180));

    it("starts the next story once the place is within NEXT_STORY_M along the route", () => {
      expect(reachedIndex(aside, at(21.015 - metres(NEXT_STORY_M - 30)), 0, along)).toBe(1);
      expect(reachedIndex(aside, at(21.015 - metres(NEXT_STORY_M + 50)), 0, along)).toBe(-1);
      // Bez linii trasy miejsce z boku zostaje niezauważone.
      expect(reachedIndex(aside, at(21.015), 0)).toBe(-1);
    });

    // Następny klip: po końcu bieżącego (`afterStory`) ten punkt, do którego dojechał telefon.
    const nextAfterStory = (lng: number) => {
      const reached = reachedIndex(aside, at(lng), 0, along);
      return afterStory({
        activeIndex: 0,
        dueIndex: Math.max(0, reached),
        stopCount: aside.length,
        auto: true,
      });
    };

    it("after a story waits calmly while the rider stands before the next place", () => {
      expect(nextAfterStory(21.005)).toBe("wait");
    });

    it("after a story picks the place the rider is coming up to", () => {
      expect(nextAfterStory(21.014)).toBe(1);
      expect(nextAfterStory(21.029)).toBe(2);
    });
  });

  it("looks only a few stops ahead, so a loop does not jump to its last stop at the start", () => {
    const loop = [...stops, stop("back", 21.0)];
    expect(reachedIndex(loop, at(21.0), 0)).toBe(-1);
    expect(reachedIndex(stops, at(21.045), 0)).toBe(-1);
    expect(reachedIndex(stops, at(21.045), 1)).toBe(3);
  });
});
