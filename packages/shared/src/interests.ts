import { z } from "zod";

/**
 * Interest keys shared by the API, the web app and the seed (docs/13-plan-bazy.md §5).
 * Polish labels live in apps/web.
 */
export const INTERESTS = [
  "war_uprising",
  "architecture",
  "industry",
  "religion",
  "jewish_warsaw",
  "everyday_life",
  "street_art",
  "people",
] as const;

export const InterestSchema = z.enum(INTERESTS);
export type Interest = z.infer<typeof InterestSchema>;
