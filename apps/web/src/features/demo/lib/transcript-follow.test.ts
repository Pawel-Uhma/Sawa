import { describe, expect, it } from "vitest";
import {
  FOLLOW_INITIAL,
  type FollowEvent,
  type FollowState,
  followReducer,
} from "./transcript-follow";

function run(events: FollowEvent[], from: FollowState = FOLLOW_INITIAL): FollowState {
  return events.reduce(followReducer, from);
}

const settleAt = (edgeGapPx: number | null): FollowEvent => ({
  type: "settle",
  edgeGapPx,
  viewportPx: 400,
});

describe("followReducer", () => {
  it("keeps following through our own scrollTo", () => {
    expect(run([{ type: "scroll" }, { type: "scroll" }, settleAt(300)]).following).toBe(true);
  });

  it("does not unpin on a tap without scrolling", () => {
    expect(run([{ type: "hold" }, { type: "release" }]).following).toBe(true);
  });

  it("unpins when the user drags the transcript", () => {
    expect(run([{ type: "hold" }, { type: "scroll" }]).following).toBe(false);
  });

  it("unpins on wheel or scroll keys", () => {
    expect(run([{ type: "user-scroll" }]).following).toBe(false);
  });

  it("stays unpinned where the user scrolled, ahead or back", () => {
    const unpinned = run([{ type: "hold" }, { type: "scroll" }, { type: "release" }]);
    expect(followReducer(unpinned, settleAt(-200)).following).toBe(false);
    expect(followReducer(unpinned, settleAt(250)).following).toBe(false);
  });

  it("does not pin again mid-gesture even with the edge on its line", () => {
    expect(run([{ type: "hold" }, { type: "scroll" }, settleAt(0)]).following).toBe(false);
  });

  it("pins again when the gesture ends with the edge back on its line", () => {
    expect(
      run([{ type: "hold" }, { type: "scroll" }, { type: "release" }, settleAt(12)]).following,
    ).toBe(true);
  });

  it("does not pin again without a spoken edge", () => {
    expect(run([{ type: "user-scroll" }, settleAt(null)]).following).toBe(false);
  });

  it("pins again on Back to Sawa", () => {
    expect(run([{ type: "user-scroll" }, { type: "resume" }]).following).toBe(true);
  });
});
