import { MAX_WAYPOINTS } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { moveStopover, type Stopover, toggleStopover } from "./waypoints";

const stop = (placeId: string): Stopover => ({ placeId, name: placeId, lat: 52.2, lng: 21 });
const ids = (list: Stopover[]) => list.map((s) => s.placeId);

describe("stopovers", () => {
  it("adds a place at the end and removes it on the second toggle", () => {
    const added = toggleStopover([stop("a")], stop("b"));
    expect(ids(added)).toEqual(["a", "b"]);
    expect(ids(toggleStopover(added, stop("a")))).toEqual(["b"]);
  });

  it("adds nothing past the limit", () => {
    const full = Array.from({ length: MAX_WAYPOINTS }, (_, i) => stop(`p${i}`));
    expect(toggleStopover(full, stop("x"))).toHaveLength(MAX_WAYPOINTS);
  });

  it("moves a stop up and down, and stays put at the ends", () => {
    const list = [stop("a"), stop("b"), stop("c")];
    expect(ids(moveStopover(list, 2, -1))).toEqual(["a", "c", "b"]);
    expect(ids(moveStopover(list, 0, 1))).toEqual(["b", "a", "c"]);
    expect(ids(moveStopover(list, 0, -1))).toEqual(["a", "b", "c"]);
    expect(ids(moveStopover(list, 2, 1))).toEqual(["a", "b", "c"]);
  });
});
