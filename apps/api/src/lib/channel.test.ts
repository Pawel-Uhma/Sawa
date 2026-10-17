import { describe, expect, it } from "vitest";
import { createReplayChannel } from "./channel";

async function all<T>(it: AsyncIterable<T>) {
  const out: T[] = [];
  for await (const x of it) out.push(x);
  return out;
}

describe("createReplayChannel", () => {
  it("gives a late reader everything from the start and then the live items", async () => {
    const ch = createReplayChannel<number>();
    ch.push(1);
    const early = all(ch.read());
    ch.push(2);
    const late = all(ch.read());
    ch.push(3);
    ch.end();
    expect(await early).toEqual([1, 2, 3]);
    expect(await late).toEqual([1, 2, 3]);
  });

  it("throws the failure to readers after the items", async () => {
    const ch = createReplayChannel<number>();
    ch.push(1);
    ch.fail(new Error("boom"));
    const seen: number[] = [];
    await expect(
      (async () => {
        for await (const x of ch.read()) seen.push(x);
      })(),
    ).rejects.toThrow("boom");
    expect(seen).toEqual([1]);
  });
});
