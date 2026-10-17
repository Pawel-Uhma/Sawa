import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { audioKey, createFixtureStore } from "./fixture-store";

const dir = () => pathToFileURL(`${mkdtempSync(join(tmpdir(), "sawa-demo-"))}/`);

describe("createFixtureStore", () => {
  it("keeps saved stories and clips across restarts", () => {
    const where = dir();
    const store = createFixtureStore(where);
    store.saveStory({
      placeId: "p1",
      text: "Tu stał Kercelak.",
      sources: [{ id: "s1", title: "Wikipedia", url: "https://pl.wikipedia.org" }],
      cached: false,
      factIds: ["f1"],
      contextIds: [],
      recap: false,
    });
    store.saveAudio("Tu stał  Kercelak.", new Uint8Array([7, 8]));

    const again = createFixtureStore(where);
    expect(again.story("p1")).toMatchObject({ text: "Tu stał Kercelak.", cached: true });
    expect(again.audio("Tu stał Kercelak.")).toEqual(new Uint8Array([7, 8]));
    expect(again.size()).toEqual({ stories: 1, clips: 1 });
  });

  it("finds nothing in an empty folder", () => {
    const store = createFixtureStore(dir());
    expect(store.story("p1")).toBeUndefined();
    expect(store.audio("Cokolwiek.")).toBeUndefined();
  });

  it("names a clip by its words, not its spacing", () => {
    expect(audioKey("A  b\nc")).toBe(audioKey("A b c"));
  });
});
