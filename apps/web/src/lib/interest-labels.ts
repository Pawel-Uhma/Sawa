import type { Interest } from "@sawa/shared";

export const INTEREST_LABELS: Record<Interest, string> = {
  war_uprising: "wojna i Powstanie",
  architecture: "architektura",
  industry: "przemysł i technika",
  religion: "religia",
  jewish_warsaw: "żydowska Warszawa",
  everyday_life: "życie codzienne",
  street_art: "sztuka ulicy",
  people: "znane postaci",
};

const LABELS_BY_KEY: Partial<Record<string, string>> = INTEREST_LABELS;

/** Data may carry keys from an older seed; show them raw rather than hiding them. */
export function interestLabel(key: string): string {
  return LABELS_BY_KEY[key] ?? key;
}
