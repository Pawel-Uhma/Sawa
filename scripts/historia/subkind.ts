// Map marker of a place (places.subkind): from kind, then keywords in the name, then tags.
// Names only: facts mention gardens, factories and ul. Ogrodowa in passing.
// Edit the rules and re-run the seed; it is idempotent.

import type { PlaceSubkind } from "@sawa/shared";

export type SubkindInput = {
  kind: string;
  name: string;
  tags: readonly string[];
};

/** Kinds that already say what the marker is; the name does not override them. */
const BY_KIND: Partial<Record<string, PlaceSubkind>> = {
  street: "street",
  monument: "monument",
  plaque: "plaque",
  mural: "mural",
  cemetery: "cemetery",
  event: "event",
};

/**
 * The word that comes first in the name wins ("Park Harcerskiej Poczty" is a park, "Muzeum Więzienia Pawiak"
 * a museum). On a tie the earlier rule wins, so the more specific words come first (skatepark before park).
 */
const BY_NAME: [PlaceSubkind, RegExp][] = [
  ["synagogue", /synagog|mykw|bo[zż]nic/],
  ["orthodox", /cerkiew|cerkwi|prawos[lł]aw/],
  ["chapel", /kaplic|kapliczk/],
  ["church", /ko[sś]ci[oó][lł]|bazylik|katedr|klasztor|parafi|zb[oó]r|meczet|ewangelick/],
  ["cemetery", /cmentarz|mauzoleum/],
  ["tenement", /kamienic/],
  ["street", /^(plac|placyk|rynek|rondo)\b/],
  ["housing", /osiedl|kolonia|\bblok|domy\b|dom mieszkalny|budynek mieszkalny|tanich mieszka/],
  ["prison", /wi[eę]zieni|pawiak|areszt|getto|getta|umschlagplatz/],
  [
    "fortress",
    /\bfort\b|cytadel|reduta|koszar|arsena[lł]|bunkier|schron\b|schrony|barykad|\bokop|wa[lł] miejski/,
  ],
  [
    "stadium",
    /stadion|hala sport|centrum sport|o[sś]rodek sport|basen|p[lł]ywal|\bkort|\btor\b|torwar|skatepark|hipodrom|\bosir\b/,
  ],
  ["pitch", /boisk|orlik/],
  ["museum", /muze|galeri/],
  ["theatre", /teatr|oper[ay]\b|operetk|filharmoni|dom kultury|centrum kultury|scena/],
  ["cinema", /\bkin[oa]\b|fotoplastikon|filmow/],
  ["library", /bibliotek|archiwum/],
  ["hospital", /szpital|klinik|lecznic|przychodni|sanatori|chirurg/],
  [
    "university",
    /uniwersytet|politechnik|akademi|uczelni|szko[lł]a g[lł][oó]wna|szko[lł]a wy[zż]sza|instytut/,
  ],
  ["school", /szk[oó][lł]|\blo\b|gimnazj|liceum|przedszkol|seminarium/],
  [
    "office",
    /urz[aą]d|ministerst|ratusz|\bsejm|\bsenat\b|senatu\b|\bs[aą]d\b|s[aą]d[oó]w|komend|komisariat|poczt|ambasad|prezydium/,
  ],
  [
    "trade",
    /hotel|\bbank|dom towarowy|pasa[zż]|\bhala\b(?! (sport|lekko|widowisk|osir))|targ|bazar|kawiarn|restaurac|cukierni|sklep|\bbar\b|gie[lł]d/,
  ],
  [
    "factory",
    /fabryk|zak[lł]ad|wytw[oó]rni|\bhut[ay]\b|elektrowni|elektrociep|gazowni|browar|rze[zź]ni|m[lł]yn|drukarni|wodoci|\bfiltry\b|warsztat|manufaktur/,
  ],
  [
    "station",
    /dworzec|dworca|zajezdni|stacja kolej|stacja metra|parowozowni|lokomotywowni|\bkolej|przystan/,
  ],
  ["bridge", /\bmost\b|mostu\b|wiadukt|k[lł]adk/],
  ["palace", /pa[lł]ac|zamek|zamku|\bbelweder\b/],
  ["manor", /\bdw[oó]r\b|dworek|dworku|\bwill[ai]\b|rezydencj/],
  ["garden", /ogr[oó]d\b|ogrod(y|zie|u|ów)\b/],
  [
    "park",
    /\bpark\b|parku\b|skwer|ogr[oó]dek|\blas\b|lasek|rezerwat|zieleni|polana|pomnik przyrody|\bd[aą]b\b/,
  ],
  ["water", /staw|jezior|glinian|kana[lł]|wis[lł]|potok|rzek|fontann|zdr[oó]j|\bport\b/],
];

/** Sacred rules: a `church` keeps one of these, whatever else its name says. */
const SACRED = new Set<PlaceSubkind>(["synagogue", "orthodox", "chapel", "church", "cemetery"]);

/** The address part of a name ("Kamienica przy Targowej 50") names a street, not the place. */
const ADDRESS = /(,|[\s(](przy|na rogu|r[oó]g|ul\.|ulicy|al\.|alei|pl\.|placu)\s).*$/;

/** Kinds whose fallback is the kind itself; `site` also looks at tags. */
const FALLBACK: Partial<Record<string, PlaceSubkind>> = {
  building: "building",
  church: "church",
};

export function assignSubkind({ kind, name, tags }: SubkindInput): PlaceSubkind {
  const fixed = BY_KIND[kind];
  if (fixed) return fixed;

  const lower = name.toLowerCase().replace(ADDRESS, "");
  // "Politechnika (stacja metra)" is the station, named after what is above it.
  if (/stacja metra/.test(lower)) return "station";
  let best: { subkind: PlaceSubkind; at: number } | null = null;
  for (const [subkind, pattern] of BY_NAME) {
    if (kind === "church" && !SACRED.has(subkind)) continue;
    const at = lower.search(pattern);
    if (at >= 0 && (!best || at < best.at)) best = { subkind, at };
  }
  if (best) return best.subkind;

  if (FALLBACK[kind]) return FALLBACK[kind];
  if (tags.includes("sport") || tags.includes("sports")) return "pitch";
  if (tags.includes("nature")) return "park";
  return "site";
}
