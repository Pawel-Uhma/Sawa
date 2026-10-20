/**
 * Ordinals written as a number with a dot ("lata 30.", "2. połowa", "1. Dywizja"), spelled out
 * for TTS. The form comes from a table of the words they go with, not from a guess: "lata 30."
 * → "lata trzydzieste", "w latach 30." → "w latach trzydziestych", "2. połowa" → "druga
 * połowa", "w 2. połowie" → "w drugiej połowie". The dot is not said.
 */

import { ordinalPl } from "./spoken-years";

/** Gender (m, n, f, pl) and case of an ordinal used as an adjective. */
export type OrdinalForm =
  | "m.nom"
  | "m.gen"
  | "m.dat"
  | "m.loc"
  | "n.nom"
  | "f.nom"
  | "f.obl"
  | "f.acc"
  | "pl.nom"
  | "pl.gen"
  | "pl.dat"
  | "pl.ins";

/** Endings after a hard stem ("trzydziest-y") and after a soft one ("drug-i", "trzec-i"). */
const HARD: Record<OrdinalForm, string> = {
  "m.nom": "y",
  "m.gen": "ego",
  "m.dat": "emu",
  "m.loc": "ym",
  "n.nom": "e",
  "f.nom": "a",
  "f.obl": "ej",
  "f.acc": "ą",
  "pl.nom": "e",
  "pl.gen": "ych",
  "pl.dat": "ym",
  "pl.ins": "ymi",
};
const SOFT: Record<OrdinalForm, string> = {
  "m.nom": "i",
  "m.gen": "iego",
  "m.dat": "iemu",
  "m.loc": "im",
  "n.nom": "ie",
  "f.nom": "ia",
  "f.obl": "iej",
  "f.acc": "ią",
  "pl.nom": "ie",
  "pl.gen": "ich",
  "pl.dat": "im",
  "pl.ins": "imi",
};

/** One ordinal word ("drugi", "ósmy", "trzeci") in the given form. */
function inflectWord(word: string, form: OrdinalForm): string {
  if (word.endsWith("y")) return `${word.slice(0, -1)}${HARD[form]}`;
  const stem = word.slice(0, -1);
  // After k and g the soft "i" is only spelling: "druga", "drugą", not "drugia".
  const ending = /[kg]$/.test(stem) ? SOFT[form].replace(/^i(?=[aą]$)/, "") : SOFT[form];
  return `${stem}${ending}`;
}

/** Ordinal 1–2099 in any form: "druga", "trzydziestych", "tysiąc dziewięćsetnym". */
export function ordinalForm(n: number, form: OrdinalForm): string {
  return ordinalPl(n)
    .split(" ")
    .map((w) => (/[yi]$/.test(w) ? inflectWord(w, form) : w))
    .join(" ");
}

/** "lata 30.", "w latach 30.", "z lat 20." (decades): the form of "lata" decides. */
const DECADE_AFTER: Record<string, OrdinalForm> = {
  lata: "pl.nom",
  lat: "pl.gen",
  latach: "pl.gen",
  latom: "pl.dat",
  latami: "pl.ins",
};

/**
 * Nouns that follow an ordinal with a dot, with the ordinal's form. `m.gen` here means the
 * noun is genitive or locative ("pułku"); a preposition like „w” makes it locative.
 */
const NOUN_AFTER: Record<string, OrdinalForm> = {
  połowa: "f.nom",
  połowy: "f.obl",
  połowie: "f.obl",
  połowę: "f.acc",
  połową: "f.acc",
  dekada: "f.nom",
  dekady: "f.obl",
  dekadzie: "f.obl",
  dekadę: "f.acc",
  dekadą: "f.acc",
  rocznica: "f.nom",
  rocznicy: "f.obl",
  rocznicę: "f.acc",
  rocznicą: "f.acc",
  armia: "f.nom",
  armii: "f.obl",
  armię: "f.acc",
  armią: "f.acc",
  dywizja: "f.nom",
  dywizji: "f.obl",
  dywizję: "f.acc",
  dywizją: "f.acc",
  brygada: "f.nom",
  brygady: "f.obl",
  brygadzie: "f.obl",
  brygadę: "f.acc",
  brygadą: "f.acc",
  kompania: "f.nom",
  kompanii: "f.obl",
  kompanię: "f.acc",
  kompanią: "f.acc",
  pułk: "m.nom",
  pułku: "m.gen",
  pułkiem: "m.loc",
  batalion: "m.nom",
  batalionu: "m.gen",
  batalionem: "m.loc",
  korpus: "m.nom",
  korpusu: "m.gen",
  korpusem: "m.loc",
  piętro: "n.nom",
  piętra: "m.gen",
  piętrze: "m.loc",
  piętrem: "m.loc",
  miejsce: "n.nom",
  miejsca: "m.gen",
  miejscu: "m.loc",
  miejscem: "m.loc",
};

/** After these a genitive-or-locative noun is locative: "w 2. pułku", "na 3. piętrze". */
const LOCATIVE_PREPS = new Set(["w", "we", "o", "po", "przy", "na"]);
const GENITIVE_PREPS = new Set(["od", "do", "z", "ze", "sprzed", "około", "koło", "spod", "dla"]);
const INSTRUMENTAL_PREPS = new Set(["przed", "za", "nad", "pod", "między"]);

/** The ordinal's form before a noun not in the table: masculine, case from the preposition. */
function formFromPrep(prep: string | undefined): OrdinalForm {
  const p = prep?.toLowerCase();
  if (p && LOCATIVE_PREPS.has(p)) return "m.loc";
  if (p && GENITIVE_PREPS.has(p)) return "m.gen";
  if (p && INSTRUMENTAL_PREPS.has(p)) return "m.loc";
  return "m.nom";
}

/** The dot after the last ordinal also ends the sentence: nothing or a new sentence follows. */
function endsSentence(rest: string): boolean {
  if (/^\s*$/.test(rest)) return true;
  // "lata 30. XX wieku": a Roman century goes on with the same sentence.
  if (/^\s+[IVX]{1,6}\s+(?:w\.|wiek)/u.test(rest)) return false;
  return /^\s+\p{Lu}/u.test(rest);
}

const DECADES =
  /(?<!\p{L})(lata|lat|latach|latom|latami) (\d{1,2}0)\.(?:( i | lub | albo | oraz |[–—-])(\d{1,2}0)\.)?/giu;

const DOTTED =
  /(?:(?<![\p{L}\p{N}])(\p{L}+) )?(?<![\p{L}\p{N}.,/:])(\d{1,4})\. (?=["„«]?(\p{L}+))/gu;

/** All ordinals with a dot in `text` as words; any other number is left as it is. */
export function spellDottedOrdinals(text: string): string {
  const decades = text.replace(
    DECADES,
    (
      all: string,
      lata: string,
      a: string,
      join: string | undefined,
      b: string | undefined,
      offset: number,
      whole: string,
    ) => {
      const form = DECADE_AFTER[lata.toLowerCase()];
      if (!form) return all;
      let spoken = `${lata} ${ordinalForm(Number(a), form)}`;
      if (join !== undefined && b !== undefined) {
        spoken += /[–—-]/.test(join)
          ? ` do ${ordinalForm(Number(b), "pl.gen")}`
          : `${join}${ordinalForm(Number(b), form)}`;
      }
      return endsSentence(whole.slice(offset + all.length)) ? `${spoken}.` : spoken;
    },
  );
  return decades.replace(
    DOTTED,
    (all: string, prep: string | undefined, digits: string, next: string) => {
      const n = Number(digits);
      if (n < 1 || n > 2099) return all;
      const known = NOUN_AFTER[next.toLowerCase()];
      // A dot before a capital that is not a known noun is the end of a sentence.
      if (!known && !/^\p{Ll}/u.test(next)) return all;
      let form = known ?? formFromPrep(prep);
      if (form === "m.gen" && prep && LOCATIVE_PREPS.has(prep.toLowerCase())) form = "m.loc";
      const spoken = `${ordinalForm(n, form)} `;
      return prep ? `${prep} ${spoken}` : spoken;
    },
  );
}
