/**
 * What Sawa remembers about one listener (kept on the device, apps/web `lib/memory.ts`):
 * which facts of which place were already told and which background stories were explained.
 */

/** Stable id of one fact or trivia line: the same text gives the same id after a reseed. */
export function factId(text: string): string {
  // FNV-1a, 32 bits: short and good enough for a few dozen lines per place.
  let hash = 0x811c9dc5;
  for (const char of text.normalize("NFC").trim()) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/** Upper bounds for what a client sends back, so a request stays small. */
export const MAX_HEARD_PLACES = 2000;
export const MAX_HEARD_FACTS = 200;
