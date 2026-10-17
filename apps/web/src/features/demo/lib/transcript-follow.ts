/*
 * Whether the story transcript follows Sawa's voice.
 * Only a scroll by the user unpins it (wheel, keys, a drag that actually moves the text);
 * our own scrollTo never does. It pins again only when the user taps „Back to Sawa”
 * or ends a gesture with the spoken edge back on its line, never mid-gesture or mid-momentum.
 */

export type FollowState = {
  /** The transcript scrolls with the voice. */
  following: boolean;
  /** A finger or mouse button is down on the transcript. */
  holding: boolean;
};

export type FollowEvent =
  /** Pointer or finger down on the transcript (a tap alone does not unpin). */
  | { type: "hold" }
  /** Pointer or finger up. */
  | { type: "release" }
  /** A scroll event: the user's own only while they hold the transcript. */
  | { type: "scroll" }
  /** Wheel or a scrolling key: always the user. */
  | { type: "user-scroll" }
  /** Scrolling stopped. `edgeGapPx` is the spoken edge's distance from its line, null without an edge. */
  | { type: "settle"; edgeGapPx: number | null; viewportPx: number }
  /** „Back to Sawa”. */
  | { type: "resume" };

export const FOLLOW_INITIAL: FollowState = { following: true, holding: false };

/** How close to its line the spoken edge must land for the transcript to pin again. */
export function snapPx(viewportPx: number): number {
  return Math.max(32, viewportPx * 0.1);
}

export function followReducer(state: FollowState, event: FollowEvent): FollowState {
  switch (event.type) {
    case "hold":
      return state.holding ? state : { ...state, holding: true };
    case "release":
      return state.holding ? { ...state, holding: false } : state;
    case "scroll":
      return state.holding && state.following ? { ...state, following: false } : state;
    case "user-scroll":
      return state.following ? { ...state, following: false } : state;
    case "settle": {
      if (state.following || state.holding || event.edgeGapPx === null) return state;
      return Math.abs(event.edgeGapPx) <= snapPx(event.viewportPx)
        ? { ...state, following: true }
        : state;
    }
    case "resume":
      return state.following ? state : { ...state, following: true };
  }
}

/** Keys that scroll a focused container. */
export const SCROLL_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
]);
