import { type Interest, InterestSchema } from "@sawa/shared";

/** Reads `?i=war_uprising,architecture`; unknown keys are dropped, duplicates removed. */
export function parseInterestsParam(value: string | null): Interest[] {
  if (!value) return [];
  const keys = value.split(",").map((key) => key.trim());
  const valid = keys.flatMap((key) => {
    const parsed = InterestSchema.safeParse(key);
    return parsed.success ? [parsed.data] : [];
  });
  return [...new Set(valid)];
}
