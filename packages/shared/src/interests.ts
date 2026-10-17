import { z } from "zod";

/**
 * What the user picks in onboarding: broad categories. Polish labels live in apps/web.
 * Places carry finer tags (PLACE_TAGS, set by the seed, docs/13-plan-bazy.md §5);
 * INTEREST_TAGS maps one to the other.
 */
export const INTERESTS = ["historical", "cultural", "sports", "nature"] as const;

export const InterestSchema = z.enum(INTERESTS);
export type Interest = z.infer<typeof InterestSchema>;

/** Tags stored on places (`places.interests` in Supabase). `sport` and `nature` await data. */
export const PLACE_TAGS = [
  "war_uprising",
  "architecture",
  "industry",
  "religion",
  "jewish_warsaw",
  "everyday_life",
  "street_art",
  "people",
  "sport",
  "nature",
] as const;
export type PlaceTag = (typeof PLACE_TAGS)[number];

export const INTEREST_TAGS: Record<Interest, readonly PlaceTag[]> = {
  historical: ["war_uprising", "jewish_warsaw", "people", "industry", "architecture"],
  cultural: ["street_art", "everyday_life", "religion"],
  sports: ["sport"],
  nature: ["nature"],
};

/** Categories a place belongs to: its detailed tags mapped, plus category names stored directly. */
export function interestsOfTags(tags: readonly string[]): Interest[] {
  return INTERESTS.filter(
    (interest) =>
      tags.includes(interest) || INTEREST_TAGS[interest].some((tag) => tags.includes(tag)),
  );
}
