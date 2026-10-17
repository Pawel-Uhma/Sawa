import { randomUUID } from "node:crypto";
import type { LiveStory, Story, StoryRequestInput } from "@sawa/shared";
import { cleanForSpeech } from "../domain/story";
import { createReplayChannel, type ReplayChannel } from "../lib/channel";
import type { SpeechService } from "./speak";
import type { StoryService } from "./tell-story";

/**
 * The player asks for the next place while the current story plays, and the tram may take
 * a while to get there; after this the session is gone and the player asks again.
 */
const SESSION_TTL_MS = 30 * 60_000;
/** A story's mp3 is about 1 MB; this keeps memory bounded with a few phones riding. */
const MAX_SESSIONS = 100;

/** One story being told: its text grows, its voice streams to every reader from the start. */
export type LiveSession = {
  state(): LiveStory;
  audio: ReplayChannel<Uint8Array>;
};

export type LiveStoryService = {
  /** Starts writing and reading the story; answers at once with the session id. */
  start(request: StoryRequestInput): string;
  get(id: string): LiveSession | undefined;
};

export type LiveStoryDeps = {
  stories: StoryService;
  speech: SpeechService;
  onError?: (err: unknown, placeId: string) => void;
};

export function createLiveStoryService({
  stories,
  speech,
  onError,
}: LiveStoryDeps): LiveStoryService {
  const sessions = new Map<string, LiveSession & { createdAt: number }>();

  function prune(now: number) {
    for (const [id, s] of sessions) {
      if (now - s.createdAt > SESSION_TTL_MS || sessions.size > MAX_SESSIONS) sessions.delete(id);
      else break;
    }
  }

  return {
    start(request) {
      const now = Date.now();
      prune(now);
      const id = randomUUID();
      const text = createReplayChannel<string>();
      const audio = createReplayChannel<Uint8Array>();
      let story: Story | null = null;
      // Unknown place or a failure before the first word: done, with nothing to say.
      let failed = false;
      sessions.set(id, {
        createdAt: now,
        audio,
        state: () => ({
          id,
          text: story?.text ?? (failed ? "" : cleanForSpeech(text.items.join(""))),
          done: story !== null || failed,
          story,
        }),
      });

      (async () => {
        try {
          const told = await stories.tellStream(request);
          // The text is read on its own, so the story finishes even when the voice fails.
          const voice = (async () => {
            try {
              for await (const bytes of speech.speakStream(text.read(), { whole: told.whole })) {
                audio.push(bytes);
              }
              audio.end();
            } catch (err) {
              audio.fail(err);
              onError?.(err, request.placeId);
            }
          })();
          for await (const piece of told.text) text.push(piece);
          text.end();
          story = await told.story;
          await voice;
        } catch (err) {
          failed = true;
          text.fail(err);
          audio.fail(err);
          onError?.(err, request.placeId);
        }
      })();
      return id;
    },

    get(id) {
      prune(Date.now());
      return sessions.get(id);
    },
  };
}
