/**
 * Word abbreviations the model or the facts write ("ul. Wolska", "o godz. 17:00", "kościół
 * św. Anny"), expanded for TTS. The case comes from the preposition before and the ending of
 * the name after, from tables. These abbreviations never end a sentence, so they are expanded
 * only when more text follows; the dot that is part of them is not said.
 */

type Case = "nom" | "gen" | "dat" | "loc" | "acc" | "ins";
type Forms = Record<Case, string>;

const LOCATIVE_PREPS = new Set(["w", "we", "o", "po", "przy", "na"]);
const GENITIVE_PREPS = new Set([
  "z",
  "ze",
  "od",
  "do",
  "u",
  "koło",
  "około",
  "obok",
  "wzdłuż",
  "naprzeciw",
  "naprzeciwko",
  "blisko",
  "dla",
  "wokół",
  "spod",
  "sprzed",
  "zza",
  "bez",
  "wśród",
  "dzięki",
]);
const INSTRUMENTAL_PREPS = new Set(["przed", "za", "nad", "pod", "między", "pomiędzy"]);
/** With a name in -ą after them, these take the accusative: "na ul. Wolską", "przez pl. Zamkowy". */
const ACCUSATIVE_PREPS = new Set(["na", "w", "we", "przez"]);

/** Case of "ulica", "aleja", "plac": from the preposition, else from the street name's ending. */
function placeCase(prep: string | undefined, next: string): Case {
  const p = prep?.toLowerCase();
  if (p === "przez") return "acc";
  if (/ą$/.test(next)) {
    if (p && ACCUSATIVE_PREPS.has(p)) return "acc";
    return "ins";
  }
  if (p && LOCATIVE_PREPS.has(p)) return "loc";
  if (p && INSTRUMENTAL_PREPS.has(p)) return "ins";
  if (p && GENITIVE_PREPS.has(p)) return "gen";
  // No preposition: "ul. Wolskiej", "pl. Zamkowego" are oblique, "ul. Wolska" nominative.
  if (/(?:ej|ego)$/.test(next)) return "gen";
  return "nom";
}

const ULICA: Forms = {
  nom: "ulica",
  gen: "ulicy",
  dat: "ulicy",
  loc: "ulicy",
  acc: "ulicę",
  ins: "ulicą",
};
const ALEJA: Forms = {
  nom: "aleja",
  gen: "alei",
  dat: "alei",
  loc: "alei",
  acc: "aleję",
  ins: "aleją",
};
/** "Al. Jerozolimskie", "w Al. Ujazdowskich": a plural name means "Aleje". */
const ALEJE: Forms = {
  nom: "aleje",
  gen: "alej",
  dat: "alejom",
  loc: "alejach",
  acc: "aleje",
  ins: "alejami",
};
const PLAC: Forms = {
  nom: "plac",
  gen: "placu",
  dat: "placowi",
  loc: "placu",
  acc: "plac",
  ins: "placem",
};
const GODZINA: Forms = {
  nom: "godzina",
  gen: "godziny",
  dat: "godzinie",
  loc: "godzinie",
  acc: "godzinę",
  ins: "godziną",
};
const KSIADZ: Forms = {
  nom: "ksiądz",
  gen: "księdza",
  dat: "księdzu",
  loc: "księdzu",
  acc: "księdza",
  ins: "księdzem",
};
const GENERAL: Forms = {
  nom: "generał",
  gen: "generała",
  dat: "generałowi",
  loc: "generale",
  acc: "generała",
  ins: "generałem",
};

/** Case of the hour after "godz.": only the preposition before tells. */
function hourCase(prep: string | undefined): Case {
  const p = prep?.toLowerCase();
  if (p === "o" || p === "po") return "loc";
  if (p === "na") return "acc";
  if (p && INSTRUMENTAL_PREPS.has(p)) return "ins";
  if (p && GENITIVE_PREPS.has(p)) return "gen";
  return "nom";
}

/** Case of a title before a man's name: "ks. Jerzego", "gen. Andersowi", "z gen. Bemem". */
function personCase(prep: string | undefined, next: string): Case {
  const p = prep?.toLowerCase();
  if (/(?:ego|a)$/.test(next)) return "gen";
  if (/(?:emu|owi)$/.test(next)) return "dat";
  if (/(?:em|[iy]m)$/.test(next)) return p && LOCATIVE_PREPS.has(p) ? "loc" : "ins";
  if (/ie$/.test(next) && p && LOCATIVE_PREPS.has(p)) return "loc";
  return "nom";
}

/** "św. Anny" → "świętej", "św. Jana" → "świętego", "św. Piotra i Pawła" → "świętych". */
function saint(next: string, after: string): string {
  if (/a$/.test(next) && /^ i \p{Lu}\p{Ll}*a(?!\p{L})/u.test(after)) return "świętych";
  if (/(?:rzy|cy)$/.test(next)) return "święty";
  if (/[yi]$/.test(next)) return "świętej";
  if (/a$/.test(next)) return "świętego";
  if (/owi$/.test(next)) return "świętemu";
  if (/em$/.test(next)) return "świętym";
  if (/ą$/.test(next)) return "świętą";
  return "święty";
}

/** "tzw. Kercelak" → "tak zwany", "tzw. getto" → "tak zwane": agrees with the next word. */
function soCalled(prep: string | undefined, next: string): string {
  const p = prep?.toLowerCase();
  if (/ego$/.test(next)) return "tak zwanego";
  if (/ej$/.test(next)) return "tak zwanej";
  if (/[iy]m$/.test(next)) return "tak zwanym";
  if (/[iy]ch$/.test(next)) return "tak zwanych";
  if (/a$/.test(next)) return p && GENITIVE_PREPS.has(p) ? "tak zwanego" : "tak zwana";
  if (/[ąę]$/.test(next)) return "tak zwaną";
  if (/(?:e|o|um)$/.test(next)) return "tak zwane";
  if (/u$/.test(next) && p && LOCATIVE_PREPS.has(p)) return "tak zwanym";
  return "tak zwany";
}

/** Nouns written before "im." in a name: "Park im. Traugutta", "szkoła im. Kościuszki". */
const NAMED_AFTER =
  /^(?:park|parku|szkoł|szkol|szpital|liceum|gimnazjum|teatr|ogród|ogrodu|instytut|muzeum|pomnik|fundacj|stadion|hal[aię]|uniwersytet|politechnik|akademi|bibliotek|plac|placu|skwer|rond|most|mostu|kościół|kościoła|osiedl|zespół|zespołu|dom|domu|centrum|klub|ośrod|przedszkol|żłob|kopiec|kopca|aleja|alei|ulica|ulicy)/iu;

/**
 * "im." is "imienia" after a noun that names something ("Park im.", "Teatr Powszechny im."),
 * but the pronoun "im" when it ends a sentence ("Pomógł im. Potem…").
 */
function isNamedAfter(before: string): boolean {
  const words = before.trimEnd().split(/\s+/);
  const word = words[words.length - 1] ?? "";
  if (NAMED_AFTER.test(word)) return true;
  if (!/^\p{Lu}/u.test(word)) return false;
  // A capital mid-sentence is a name ("Teatr Powszechny"); at the start it is just a capital.
  const prev = words[words.length - 2];
  return prev !== undefined && !/[.!?…]["”»]?$/.test(prev);
}

/** Keeps the capital of the abbreviation: "Al." → "Aleje", "ul." → "ulica". */
function withCapital(abbr: string, word: string): string {
  return /^\p{Lu}/u.test(abbr) ? `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}` : word;
}

const ABBREVIATION =
  /(?:(?<![\p{L}\p{N}])(\p{L}+) )?(?<![\p{L}\p{N}.])(ul|al|pl|godz|im|św|ks|gen|tzw|m\.in)\.(?=\s+["„«]?([\p{L}\p{N}]+))/giu;

/** Expands "ul.", "al.", "pl.", "godz.", "im.", "św.", "ks.", "gen.", "tzw." and "m.in.". */
export function expandWordAbbreviations(text: string): string {
  return text.replace(
    ABBREVIATION,
    (
      all: string,
      prep: string | undefined,
      abbr: string,
      next: string,
      offset: number,
      whole: string,
    ) => {
      const key = abbr.toLowerCase();
      const before = whole.slice(0, offset + (prep ? prep.length + 1 : 0));
      const after = whole.slice(offset + all.length).replace(/^\s+["„«]?[\p{L}\p{N}]+/u, "");
      let word: string;
      switch (key) {
        case "ul":
          word = ULICA[placeCase(prep, next)];
          break;
        case "al":
          word = (/(?:ie|ich|imi)$/.test(next) ? ALEJE : ALEJA)[placeCase(prep, next)];
          if (/ich$/.test(next) && !(prep && LOCATIVE_PREPS.has(prep.toLowerCase()))) {
            word = ALEJE.gen;
          }
          break;
        case "pl":
          word = PLAC[/[iy]m$/.test(next) && !prep ? "loc" : placeCase(prep, next)];
          break;
        case "godz":
          word = prep?.toLowerCase() === "w" ? "godzinach" : GODZINA[hourCase(prep)];
          break;
        case "im":
          if (!isNamedAfter(before)) return all;
          word = "imienia";
          break;
        case "św":
          word = saint(next, after);
          break;
        case "ks":
          word = KSIADZ[personCase(prep, next)];
          break;
        case "gen":
          word = GENERAL[personCase(prep, next)];
          break;
        case "tzw":
          word = soCalled(prep, next);
          break;
        default:
          word = "między innymi";
      }
      const spoken = withCapital(abbr, word);
      return prep ? `${prep} ${spoken}` : spoken;
    },
  );
}
