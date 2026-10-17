import { describe, expect, it } from "vitest";
import {
  isSawaSpeaking,
  type MusicEvent,
  noteHz,
  parseMusicPreference,
  shouldSwitchTrack,
  TRACK_MAX_SEC,
  TRACK_MIN_SEC,
  TRACKS,
  trackAt,
} from "./ride-music";

const track = (id: string) => {
  const found = TRACKS.find((t) => t.id === id);
  if (!found) throw new Error(id);
  return found;
};

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

const hzOf = (events: MusicEvent[]) =>
  events.flatMap((e) => (e.kind === "keys" || e.kind === "pluck" ? [e.hz] : []));

describe("noteHz", () => {
  it("tunes A4 to 440 Hz and goes an octave per 12 semitones", () => {
    expect(noteHz("A4")).toBe(440);
    expect(noteHz("A3")).toBeCloseTo(220);
    expect(noteHz("C4")).toBeCloseTo(261.63, 1);
    expect(noteHz("F#3")).toBeCloseTo(noteHz("Gb3"));
  });

  it("rejects a name that is not a note", () => {
    expect(() => noteHz("H4")).toThrow();
  });
});

describe("lo-fi track", () => {
  const never = () => 0.99;

  it("opens every bar with a strummed chord, bass, kick and hat", () => {
    const events = track("lofi").create(never)(0);
    expect(events.filter((e) => e.kind === "keys")).toHaveLength(5);
    expect(events.map((e) => e.kind)).toEqual(expect.arrayContaining(["kick", "hat"]));
    const offsets = events.filter((e) => e.kind === "keys").map((e) => e.offsetSec);
    expect(new Set(offsets).size).toBeGreaterThan(1);
  });

  it("plays the snare on the backbeat", () => {
    const step = track("lofi").create(never);
    const kinds = (n: number) => step(n).map((e) => e.kind);
    expect(kinds(4)).toContain("snare");
    expect(kinds(12)).toContain("snare");
    expect(kinds(8)).not.toContain("snare");
  });

  it("moves to the next chord every bar and loops after four", () => {
    const step = track("lofi").create(never);
    expect(hzOf(step(16))).not.toEqual(hzOf(step(0)));
    expect(hzOf(step(64))).toEqual(hzOf(step(0)));
  });
});

describe("pulse track", () => {
  it("plucks on every step and lays a bass and chord pad at each chord change", () => {
    const step = track("pulse").create(Math.random);
    const first = step(0);
    expect(first.filter((e) => e.kind === "pad")).toHaveLength(2);
    expect(first.filter((e) => e.kind === "pluck")).toHaveLength(1);
    expect(step(1).map((e) => e.kind)).toEqual(["pluck"]);
  });

  it("keeps the filter in a soft range", () => {
    const step = track("pulse").create(Math.random);
    for (let n = 0; n < 400; n++) {
      for (const e of step(n))
        if (e.kind === "pluck") expect(e.cutoffHz).toBeGreaterThanOrEqual(200);
    }
  });
});

describe("every track", () => {
  it.each(TRACKS.map((t) => t.id))("%s stays between the bass and the top of the melody", (id) => {
    const step = track(id).create(seeded(7));
    for (let n = 0; n < 500; n++) {
      for (const hz of hzOf(step(n))) {
        expect(hz).toBeGreaterThanOrEqual(noteHz("C2") - 0.01);
        expect(hz).toBeLessThanOrEqual(noteHz("D6") + 0.01);
      }
    }
  });
});

describe("trackAt", () => {
  it("alternates the tracks, starting with lo-fi", () => {
    expect(trackAt(0).id).toBe("lofi");
    expect(trackAt(1).id).toBe("pulse");
    expect(trackAt(2).id).toBe("lofi");
  });
});

describe("shouldSwitchTrack", () => {
  it("waits for Sawa to start talking, so the change hides under her voice", () => {
    expect(shouldSwitchTrack(TRACK_MIN_SEC - 1, true)).toBe(false);
    expect(shouldSwitchTrack(TRACK_MIN_SEC, false)).toBe(false);
    expect(shouldSwitchTrack(TRACK_MIN_SEC, true)).toBe(true);
  });

  it("switches anyway when Sawa stays quiet for long", () => {
    expect(shouldSwitchTrack(TRACK_MAX_SEC, false)).toBe(true);
  });
});

describe("isSawaSpeaking", () => {
  const playing = { isPlaying: true, loading: false, failed: false, progress: 40 };

  it("is true while a story plays", () => {
    expect(isSawaSpeaking(playing)).toBe(true);
  });

  it("lets the music back up when there is nothing to say", () => {
    expect(isSawaSpeaking({ ...playing, isPlaying: false })).toBe(false);
    expect(isSawaSpeaking({ ...playing, loading: true })).toBe(false);
    expect(isSawaSpeaking({ ...playing, failed: true })).toBe(false);
    expect(isSawaSpeaking({ ...playing, progress: 100 })).toBe(false);
  });
});

describe("parseMusicPreference", () => {
  it("is on unless the listener turned it off", () => {
    expect(parseMusicPreference(null)).toBe(true);
    expect(parseMusicPreference("on")).toBe(true);
    expect(parseMusicPreference("off")).toBe(false);
  });
});
