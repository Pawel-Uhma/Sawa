/**
 * A stream that keeps everything pushed into it, so each reader gets it from the start and then
 * follows live: the voice of a story can be fetched again while it is still being made.
 */
export type ReplayChannel<T> = {
  readonly items: readonly T[];
  readonly done: boolean;
  readonly error: unknown;
  push(item: T): void;
  end(): void;
  fail(err: unknown): void;
  read(): AsyncGenerator<T>;
};

export function createReplayChannel<T>(): ReplayChannel<T> {
  const items: T[] = [];
  let done = false;
  let error: unknown;
  let waiters: (() => void)[] = [];
  const wake = () => {
    const woken = waiters;
    waiters = [];
    for (const w of woken) w();
  };

  return {
    items,
    get done() {
      return done;
    },
    get error() {
      return error;
    },
    push(item) {
      if (done) return;
      items.push(item);
      wake();
    },
    end() {
      done = true;
      wake();
    },
    fail(err) {
      if (done) return;
      error = err ?? new Error("channel failed");
      done = true;
      wake();
    },
    async *read() {
      let i = 0;
      while (true) {
        if (i < items.length) {
          yield items[i++] as T;
          continue;
        }
        if (error !== undefined) throw error;
        if (done) return;
        await new Promise<void>((resolve) => waiters.push(resolve));
      }
    },
  };
}
