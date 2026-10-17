import { describe, expect, it } from "vitest";
import type { MockStop } from "./mock-data";
import { clipKey, spokenLength, targetSecFor } from "./story-player";

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
