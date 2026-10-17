import { z } from "zod";

/** One story fits easily; longer text costs ElevenLabs credits for nothing on stage. */
export const MAX_SPEECH_CHARS = 2_500;

/** POST /v1/speech body. The answer is audio/mpeg, not JSON. */
export const SpeechRequestSchema = z.object({
  text: z.string().trim().min(1).max(MAX_SPEECH_CHARS),
});
export type SpeechRequest = z.infer<typeof SpeechRequestSchema>;
