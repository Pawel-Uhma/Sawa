/** Synthesized speech ready to send to the client. */
export type SpeechAudio = {
  audio: Uint8Array<ArrayBuffer>;
  contentType: string;
};

/**
 * Text as it goes to TTS and as the cache key: same words with different spacing are one clip.
 * Line breaks become spaces because ElevenLabs reads a newline as a long pause.
 */
export function normalizeSpeechText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
