import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { PlaceSourceSchema, type Story } from "@sawa/shared";
import { z } from "zod";
import { normalizeSpeechText } from "../../domain/speech";
import type { FixtureStore } from "../../services/demo";

const StoryFixtureSchema = z.object({
  placeId: z.string(),
  text: z.string().min(1),
  sources: z.array(PlaceSourceSchema),
  factIds: z.array(z.string()).default([]),
  contextIds: z.array(z.string()).default([]),
});
const StoriesFileSchema = z.record(z.string(), StoryFixtureSchema);

/** The clip's file name: same words with different spacing are one clip, as in the TTS cache. */
export function audioKey(text: string): string {
  return createHash("sha1").update(normalizeSpeechText(text)).digest("hex").slice(0, 16);
}

/** `stories.json` (place id → story) and `audio/<hash of the text>.mp3` in `dir`. */
export function createFixtureStore(dir: URL): FixtureStore {
  const storiesFile = new URL("stories.json", dir);
  const audioDir = new URL("audio/", dir);
  const stories = new Map<string, Story>();
  // Clips are read from disk on each request; the OS page cache keeps them in memory.
  const clips = new Set(existsSync(audioDir) ? readdirSync(audioDir) : []);

  if (existsSync(storiesFile)) {
    const parsed = StoriesFileSchema.parse(JSON.parse(readFileSync(storiesFile, "utf8")));
    for (const [id, s] of Object.entries(parsed)) {
      stories.set(id, { ...s, cached: true, recap: false });
    }
  }

  const fileName = (text: string) => `${audioKey(text)}.mp3`;

  function writeStories() {
    mkdirSync(dir, { recursive: true });
    const out = Object.fromEntries(
      [...stories.values()].map(({ placeId, text, sources, factIds, contextIds }) => [
        placeId,
        { placeId, text, sources, factIds, contextIds },
      ]),
    );
    writeFileSync(storiesFile, `${JSON.stringify(out, null, 2)}\n`);
  }

  return {
    story: (placeId) => stories.get(placeId),
    saveStory(story) {
      // The first story recorded for a place stays: it is the one the rehearsal heard.
      if (stories.has(story.placeId)) return;
      stories.set(story.placeId, { ...story, cached: true, recap: false });
      writeStories();
    },
    audio(text) {
      const name = fileName(text);
      if (!clips.has(name)) return undefined;
      const buf = readFileSync(new URL(name, audioDir));
      return new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    },
    saveAudio(text, audio) {
      const name = fileName(text);
      if (clips.has(name)) return;
      mkdirSync(audioDir, { recursive: true });
      writeFileSync(new URL(name, audioDir), audio);
      clips.add(name);
    },
    size: () => ({ stories: stories.size, clips: clips.size }),
  };
}
