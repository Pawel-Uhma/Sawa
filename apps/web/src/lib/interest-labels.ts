import type { Interest, PlaceTag } from "@sawa/shared";

/** Categories the user picks in onboarding. */
export const INTEREST_LABELS: Record<Interest, string> = {
  historical: "historia",
  cultural: "kultura",
  sports: "sport",
  nature: "natura",
};

/** Finer tags stored on places, shown on the place card. */
export const PLACE_TAG_LABELS: Record<PlaceTag, string> = {
  war_uprising: "wojna i Powstanie",
  architecture: "architektura",
  industry: "przemysł i technika",
  religion: "religia",
  jewish_warsaw: "żydowska Warszawa",
  everyday_life: "życie codzienne",
  street_art: "sztuka ulicy",
  people: "znane postaci",
  sport: "sport",
  nature: "natura",
};

const TAG_LABELS_BY_KEY: Partial<Record<string, string>> = PLACE_TAG_LABELS;

/** Data may carry tags from an older seed; show them raw rather than hiding them. */
export function placeTagLabel(tag: string): string {
  return TAG_LABELS_BY_KEY[tag] ?? tag;
}
