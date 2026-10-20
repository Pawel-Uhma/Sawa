import { describe, expect, it } from "vitest";
import type { MockStop } from "./mock-data";
import {
  clipKey,
  fadeAt,
  knownContextsWith,
  pausedFromOutside,
  playFailed,
  seekTarget,
  spokenCut,
  spokenLength,
  spokenWordCount,
  targetSecFor,
  voiceTransition,
} from "./story-player";

describe("knownContextsWith", () => {
  it("dodaje tło opowiedziane na trasie, zanim trafiło do pamięci", () => {
    expect(knownContextsWith([], new Set(["powstanie-1944"]))).toEqual(["powstanie-1944"]);
  });

  it("nie powtarza tła, które już jest w pamięci", () => {
    expect(knownContextsWith(["powstanie-1944"], ["powstanie-1944", "getto-warszawskie"])).toEqual([
      "powstanie-1944",
      "getto-warszawskie",
    ]);
  });
});

describe("clipKey", () => {
  const listener = { interests: ["historical" as const], storyStyle: "fun" as const };

  it("changes with interests, style and story length, not only the stop", () => {
    const key = clipKey("p1", listener, 60);
    expect(clipKey("p1", listener, 60)).toBe(key);
    expect(clipKey("p1", { ...listener, interests: ["nature"] }, 60)).not.toBe(key);
    expect(clipKey("p1", { ...listener, storyStyle: "deep" }, 60)).not.toBe(key);
    expect(clipKey("p1", listener, 120)).not.toBe(key);
    expect(clipKey("p2", listener, 60)).not.toBe(key);
  });
});

describe("targetSecFor", () => {
  const stop = (etaSec: number, windowSec?: number) =>
    ({ id: `p${etaSec}`, etaSec, etaMin: Math.round(etaSec / 60), windowSec }) as MockStop;

  it("takes the planner's window when there is one", () => {
    expect(targetSecFor([stop(0, 90), stop(200)], 0)).toBe(90);
  });

  it("else talks until the next stop", () => {
    expect(targetSecFor([stop(30), stop(170)], 0)).toBe(140);
  });
});

describe("spokenLength", () => {
  const text = "Pałac Kultury stoi tu od 1955 roku.";

  it("lights nothing before Sawa starts", () => {
    expect(spokenLength(text, 0)).toBe(0);
  });

  it("lights the word Sawa is saying now, whole", () => {
    // 30% to środek „Kultury”: słowo świeci w całości, nie dopiero po wypowiedzeniu
    expect(text.slice(0, spokenLength(text, 30))).toBe("Pałac Kultury");
  });

  it("lights everything at the end", () => {
    expect(spokenLength(text, 100)).toBe(text.length);
    expect(spokenLength(text, 97)).toBe(text.length);
  });
});

describe("spokenWordCount", () => {
  const text = "W 1867 roku stanął tu dworzec.";
  const times = [0, 0.2, 1.4, 1.8, 2.3, 2.5];

  it("follows the voice's word times, a bit ahead", () => {
    expect(spokenWordCount(text, 10, times, 0)).toBe(1);
    expect(spokenWordCount(text, 10, times, 1.0)).toBe(2);
    // The year takes long to say: "roku" waits for the voice, whatever the guess says.
    expect(spokenWordCount(text, 60, times, 1.36)).toBe(3);
    expect(spokenWordCount(text, 99, times, 9)).toBe(6);
  });

  it("guesses from progress without times or without the voice", () => {
    const guess = spokenWordCount(text, 50, undefined, 1);
    expect(guess).toBe(text.slice(0, spokenLength(text, 50)).split(/\s+/).length);
    expect(spokenWordCount(text, 50, times, null)).toBe(guess);
    expect(spokenWordCount(null, 50, times, 1)).toBe(0);
  });

  it("does not fall behind the guess past the last known time", () => {
    expect(spokenWordCount(text, 90, [0, 0.2], 5)).toBeGreaterThan(2);
  });
});

describe("spokenCut", () => {
  it("ends after the given word", () => {
    expect(spokenCut("Tu  stoi dom.", 2)).toBe("Tu  stoi".length);
    expect(spokenCut("Tu stoi", 0)).toBe(0);
    expect(spokenCut("Tu stoi", 5)).toBe(7);
  });
});

describe("playFailed", () => {
  it("pauses Sawa when the browser blocks or cannot play the voice", () => {
    expect(playFailed({ name: "NotAllowedError" })).toBe(true);
    expect(playFailed({ name: "NotSupportedError" })).toBe(true);
    expect(playFailed(undefined)).toBe(true);
  });

  it("ignores our own interruption (pause or a new clip while the voice loads)", () => {
    expect(playFailed({ name: "AbortError" })).toBe(false);
  });
});

describe("pausedFromOutside", () => {
  const stopped = { speaking: true, loaded: true, paused: true, ended: false };

  it("catches the lock screen, unplugged headphones or a call pausing the voice", () => {
    expect(pausedFromOutside(stopped)).toBe(true);
  });

  it("is not our own pause, the end of a story or the previous clip", () => {
    expect(pausedFromOutside({ ...stopped, speaking: false })).toBe(false);
    expect(pausedFromOutside({ ...stopped, ended: true })).toBe(false);
    expect(pausedFromOutside({ ...stopped, loaded: false })).toBe(false);
    expect(pausedFromOutside({ ...stopped, paused: false })).toBe(false);
  });
});

describe("seekTarget", () => {
  const done = { done: true, duration: 60, buffered: 60 };
  const streaming = { done: false, duration: Number.POSITIVE_INFINITY, buffered: 20 };

  it("przewija o 15 s w obie strony", () => {
    expect(seekTarget(30, 15, done)).toBe(45);
    expect(seekTarget(30, -15, done)).toBe(15);
  });

  it("wstecz nie schodzi poniżej początku", () => {
    expect(seekTarget(5, -15, done)).toBe(0);
  });

  it("gotowa opowieść przewija się najdalej do końca", () => {
    expect(seekTarget(50, 15, done)).toBe(60);
  });

  it("w trakcie pisania do przodu tylko w pobranym kawałku, z zapasem", () => {
    expect(seekTarget(10, 15, streaming)).toBe(19);
  });

  it("w trakcie pisania nie cofa, gdy bufor jest tuż za głosem", () => {
    expect(seekTarget(19.5, 15, streaming)).toBe(19.5);
  });
});

describe("fadeAt", () => {
  it("idzie z czasem i kończy się na 1", () => {
    expect(fadeAt(0, 500, false)).toBe(0);
    expect(fadeAt(250, 500, false)).toBe(0.5);
    expect(fadeAt(900, 500, false)).toBe(1);
  });

  it("przy ukrytej stronie od razu kończy, żeby głos nie został wyciszony", () => {
    expect(fadeAt(0, 500, true)).toBe(1);
  });
});

describe("voiceTransition", () => {
  const base = { hasSound: true, paused: false, ended: false, nextHasVoice: true, canFade: true };

  it("crossfades a topic cut short instead of a hard cut", () => {
    expect(voiceTransition(base)).toBe("crossfade");
  });

  it("cuts on iOS, where two voices would overlap at full volume", () => {
    expect(voiceTransition({ ...base, canFade: false })).toBe("cut");
  });

  it("takes a breath after a story that ended by itself", () => {
    expect(voiceTransition({ ...base, ended: true, paused: true })).toBe("breath");
  });

  it("starts at once when nothing plays", () => {
    expect(voiceTransition({ ...base, hasSound: false })).toBe("start");
    expect(voiceTransition({ ...base, paused: true })).toBe("start");
  });

  it("only fades out while the next clip has no voice yet", () => {
    expect(voiceTransition({ ...base, nextHasVoice: false })).toBe("fade-out");
    expect(voiceTransition({ ...base, nextHasVoice: false, ended: true })).toBe("start");
  });
});
