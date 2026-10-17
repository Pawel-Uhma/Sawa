import type { Interest, PlaceTag } from "@sawa/shared";
import type { Lang } from "@/features/i18n";

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
export function placeTagLabel(tag: string, lang: Lang = "pl"): string {
  const labels = lang === "en" ? TAG_LABELS_EN_BY_KEY : TAG_LABELS_BY_KEY;
  return labels[tag] ?? tag;
}

export const INTEREST_LABELS_EN: Record<Interest, string> = {
  historical: "history",
  cultural: "culture",
  sports: "sport",
  nature: "nature",
};

export const PLACE_TAG_LABELS_EN: Record<PlaceTag, string> = {
  war_uprising: "war and the Uprising",
  architecture: "architecture",
  industry: "industry and engineering",
  religion: "religion",
  jewish_warsaw: "Jewish Warsaw",
  everyday_life: "everyday life",
  street_art: "street art",
  people: "famous people",
  sport: "sport",
  nature: "nature",
};

const TAG_LABELS_EN_BY_KEY: Partial<Record<string, string>> = PLACE_TAG_LABELS_EN;

export function interestLabel(interest: Interest, lang: Lang = "pl"): string {
  return (lang === "en" ? INTEREST_LABELS_EN : INTEREST_LABELS)[interest];
}
