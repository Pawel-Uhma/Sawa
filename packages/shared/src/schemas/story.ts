import { z } from "zod";
import { InterestSchema } from "../interests";
import { PlaceSourceSchema } from "./place";

/** A story never runs longer than the longest window the planner gives (docs/12-plan-mvp.md §8). */
export const MAX_STORY_SEC = 600;

/** POST /v1/stories body. `targetSec` is how long Sawa may talk before the next place. */
export const StoryRequestSchema = z.object({
  placeId: z.string().min(1),
  interests: z.array(InterestSchema).default([]),
  targetSec: z.number().int().positive().max(MAX_STORY_SEC),
});
export type StoryRequest = z.infer<typeof StoryRequestSchema>;

/** What Sawa says about one place. `sources` are only those the text relies on. */
export const StorySchema = z.object({
  placeId: z.string(),
  text: z.string().min(1),
  sources: z.array(PlaceSourceSchema),
  cached: z.boolean(),
});
export type Story = z.infer<typeof StorySchema>;
