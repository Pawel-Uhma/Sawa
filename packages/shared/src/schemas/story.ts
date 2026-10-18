import { z } from "zod";
import { InterestSchema } from "../interests";
import { MAX_HEARD_FACTS, MAX_HEARD_PLACES } from "../memory";
import { PlaceSourceSchema } from "./place";
// MAX_STORY_SEC lives in route.ts with the planner windows it bounds (one import direction).
import { AUDIENCES, FAMILIARITY, MAX_STORY_SEC, STORY_STYLES } from "./route";

/** Which side of the vehicle the place is on, as the rider faces forward. */
export const SIDES = ["left", "right"] as const;
export type Side = (typeof SIDES)[number];

/** Language of the story and its voice: the interface's language. */
export const STORY_LANGS = ["pl", "en"] as const;
export type StoryLang = (typeof STORY_LANGS)[number];

/** POST /v1/stories body. `targetSec` is how long Sawa may talk before the next place. */
export const StoryRequestSchema = z.object({
  placeId: z.string().min(1),
  interests: z.array(InterestSchema).default([]),
  targetSec: z.number().int().positive().max(MAX_STORY_SEC),
  /** Onboarding answers: the tone of the story, and whether background gets explained. */
  storyStyle: z.enum(STORY_STYLES).optional(),
  familiarity: z.enum(FAMILIARITY).optional(),
  /** "kids": simpler words, shorter, a question at the end; war told gently. Missing: "adult". */
  audience: z.enum(AUDIENCES).optional(),
  /** "en": Sawa tells the story and reads it in English. Missing: "pl". */
  lang: z.enum(STORY_LANGS).optional(),
  /** Missing: the side is unknown (e.g. a place tapped on the map), Sawa does not name it. */
  side: z.enum(SIDES).optional(),
  /** `factId`s of this place the listener already heard; Sawa tells the others first. */
  heardFacts: z.array(z.string().max(16)).max(MAX_HEARD_FACTS).default([]),
  /** Background stories already explained (`Story.contextIds`), never explained again. */
  knownContexts: z.array(z.string().max(40)).max(50).default([]),
  /**
   * Seconds since the listener last heard a story about this place (apps/web memory `at`).
   * Missing: never. Sawa says "trzy miesiące temu opowiadałam ci o…" instead of "Pamiętasz…".
   */
  heardAgoSec: z.number().int().nonnegative().optional(),
  /** "Opowiedz więcej": the listener asked for more about this place, not the route's turn. */
  more: z.boolean().optional(),
  /**
   * Places the listener already heard about (only with `more`): when nothing new is left here,
   * Sawa suggests a nearby place outside this list.
   */
  heardPlaceIds: z.array(z.string()).max(MAX_HEARD_PLACES).optional(),
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
  /**
   * With `more` and nothing new left: a nearby place Sawa offers to tell about instead
   * ("ale mogę ci opowiedzieć o …"). The client shows it as a button.
   */
  suggestion: z.object({ placeId: z.string(), name: z.string() }).nullable().optional(),
  /** Nothing worth telling here (a dull place, no story found): the client stays quiet. */
  silent: z.boolean().optional(),
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
  /**
   * When each word of `text` (split on whitespace) starts in the voice, in seconds from the
   * start of the clip; grows with the voice. Missing or shorter than the text: not known yet.
   */
  wordTimes: z.array(z.number().nonnegative()).optional(),
});
export type LiveStory = z.infer<typeof LiveStorySchema>;
