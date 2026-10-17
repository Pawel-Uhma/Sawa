import { z } from "zod";
import { InterestSchema } from "../interests";
import { MAX_HEARD_FACTS } from "../memory";
import { PlaceSourceSchema } from "./place";
// MAX_STORY_SEC lives in route.ts with the planner windows it bounds (one import direction).
import { FAMILIARITY, MAX_STORY_SEC, STORY_STYLES } from "./route";

/** POST /v1/stories body. `targetSec` is how long Sawa may talk before the next place. */
export const StoryRequestSchema = z.object({
  placeId: z.string().min(1),
  interests: z.array(InterestSchema).default([]),
  targetSec: z.number().int().positive().max(MAX_STORY_SEC),
  /** Onboarding answers: the tone of the story, and whether background gets explained. */
  storyStyle: z.enum(STORY_STYLES).optional(),
  familiarity: z.enum(FAMILIARITY).optional(),
  /** `factId`s of this place the listener already heard; Sawa tells the others first. */
  heardFacts: z.array(z.string().max(16)).max(MAX_HEARD_FACTS).default([]),
  /** Background stories already explained (`Story.contextIds`), never explained again. */
  knownContexts: z.array(z.string().max(40)).max(50).default([]),
});
export type StoryRequest = z.infer<typeof StoryRequestSchema>;
/** What a client sends; the lists may be left out. */
export type StoryRequestInput = z.input<typeof StoryRequestSchema>;

/** What Sawa says about one place. `sources` are only those the text relies on. */
export const StorySchema = z.object({
  placeId: z.string(),
  text: z.string().min(1),
  sources: z.array(PlaceSourceSchema),
  cached: z.boolean(),
  /** `factId`s the story tells; the client remembers them once the story was heard. */
  factIds: z.array(z.string()),
  /** Background explained in this story (e.g. the Warsaw Uprising for a first-timer). */
  contextIds: z.array(z.string()),
  /** Every fact of the place was heard before: a short reminder, nothing new. */
  recap: z.boolean(),
});
export type Story = z.infer<typeof StorySchema>;

/** POST /v1/stories/warm body: places of a planned route, researched before the ride starts. */
export const StoryWarmRequestSchema = z.object({
  placeIds: z.array(z.string().min(1)).min(1).max(40),
});
export type StoryWarmRequest = z.infer<typeof StoryWarmRequestSchema>;

/**
 * GET /v1/stories/live/:id: the story while Sawa is still writing it. `text` grows until `done`;
 * then `story` holds what it told (for the listener's memory). The voice streams from `…/audio`.
 */
export const LiveStorySchema = z.object({
  id: z.string(),
  text: z.string(),
  done: z.boolean(),
  story: StorySchema.nullable(),
});
export type LiveStory = z.infer<typeof LiveStorySchema>;
