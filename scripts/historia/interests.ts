// Interest tagging rules for the seed (docs/13-plan-bazy.md §5, karta R2 „Kategorie zainteresowań”).
// Tags come from @sawa/shared; INTEREST_TAGS maps them to the 4 categories the user picks.
// Edit the rules and re-run the seed; it is idempotent.

import { PLACE_TAGS, type PlaceTag } from "@sawa/shared";

export type InterestInput = {
  kind: string;
  name: string;
  text: string; // name + facts + trivia
  hasPeople: boolean;
};

type Rule = {
  pattern?: RegExp; // on name + facts + trivia
  namePattern?: RegExp; // on the name only, for words that facts mention in passing
  kinds?: string[];
  whenPeople?: boolean;
};

const RULES: Record<PlaceTag, Rule> = {
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
  // Facts mention gardens, pools and ul. Ogrodowa in passing, so these look at the name only.
  sport: { namePattern: /stadion|boisk|pływalni|basen|sportow|klub sportowy/ },
  nature: { namePattern: /^(park|ogr[óo]d|ogrody|skwer)\b|pomnik przyrody|^dąb\b|drzew/ },
};

export function assignInterests({ kind, name, text, hasPeople }: InterestInput): PlaceTag[] {
  const lower = text.toLowerCase();
  const lowerName = name.toLowerCase();
  return PLACE_TAGS.filter((key) => {
    const rule = RULES[key];
    return (
      (rule.pattern?.test(lower) ?? false) ||
      (rule.namePattern?.test(lowerName) ?? false) ||
      (rule.kinds?.includes(kind) ?? false) ||
      (rule.whenPeople === true && hasPeople)
    );
  });
}
