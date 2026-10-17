// Interest tagging rules for the seed (docs/13-plan-bazy.md §5).
// Keys are a proposal until R3 + R2 confirm the list (docs/12-plan-mvp.md Z6).
// Edit the rules and re-run the seed; it is idempotent.

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

export type Interest = (typeof INTERESTS)[number];

export type InterestInput = {
  kind: string;
  text: string; // name + facts + trivia
  hasPeople: boolean;
};

type Rule = { pattern?: RegExp; kinds?: string[]; whenPeople?: boolean };

const RULES: Record<Interest, Rule> = {
  war_uprising: { pattern: /powsta|1944|okupac|niemc|rzez|wojn|egzekuc/ },
  architecture: {
    pattern: /kamienic|architekt|projekt|secesj|modernis|klasycys|wieżowiec/,
    kinds: ["building"],
  },
  industry: { pattern: /fabry|zakład|elektrown|browar|tramwaj|kolej|gazown|przemys/ },
  religion: { pattern: /kości|cerkiew|synagog|parafi|zakon/, kinds: ["church", "cemetery"] },
  jewish_warsaw: { pattern: /getto|getcie|żyd|synagog|ringelblum|korczak/ },
  everyday_life: { pattern: /bazar|targ|kercelak|sklep|handl|kino|gwar/ },
  street_art: { pattern: /mural|graffiti/, kinds: ["mural"] },
  people: { whenPeople: true },
};

export function assignInterests({ kind, text, hasPeople }: InterestInput): Interest[] {
  const lower = text.toLowerCase();
  return INTERESTS.filter((key) => {
    const rule = RULES[key];
    return (
      (rule.pattern?.test(lower) ?? false) ||
      (rule.kinds?.includes(kind) ?? false) ||
      (rule.whenPeople === true && hasPeople)
    );
  });
}
