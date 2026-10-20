/**
 * English numbers a voice misreads, spelled out for TTS: decades ("1930s" → "nineteen
 * thirties", "the '60s" → "the sixties") and ordinals ("20th century" → "twentieth century").
 * Years and other plain numbers stay in digits: both voices read them well in English.
 */

const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const TEENS = [
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** 0–99 as words: "seven", "fourteen", "forty-two". */
function under100(n: number): string {
  if (n < 10) return ONES[n] || "zero";
  if (n < 20) return TEENS[n - 10] ?? "";
  const u = n % 10;
  const tens = TENS[Math.floor(n / 10)] ?? "";
  return u ? `${tens}-${ONES[u]}` : tens;
}

/** 1–999 as words: "three hundred and five". */
function cardinalEn(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (!h) return under100(rest);
  return rest ? `${ONES[h]} hundred and ${under100(rest)}` : `${ONES[h]} hundred`;
}

/** A year as it is said: 1930 → "nineteen thirty", 1900 → "nineteen hundred", 2000 → "two thousand". */
function yearEn(y: number): string {
  if (y >= 2000 && y < 2010) return y === 2000 ? "two thousand" : `two thousand ${ONES[y % 10]}`;
  const hi = Math.floor(y / 100);
  const lo = y % 100;
  if (!lo) return `${under100(hi)} hundred`;
  return `${under100(hi)} ${lo < 10 ? `oh ${ONES[lo]}` : under100(lo)}`;
}

const ORDINAL_WORDS: Record<string, string> = {
  one: "first",
  two: "second",
  three: "third",
  five: "fifth",
  eight: "eighth",
  nine: "ninth",
  twelve: "twelfth",
};

/** 1–999 as an ordinal: "first", "twentieth", "twenty-first", "one hundredth". */
function ordinalEn(n: number): string {
  const words = cardinalEn(n);
  return words.replace(/[a-z]+$/, (last) => {
    if (ORDINAL_WORDS[last]) return ORDINAL_WORDS[last];
    if (last.endsWith("y")) return `${last.slice(0, -1)}ieth`;
    return `${last}th`;
  });
}

/** "thirty" → "thirties", "hundred" → "hundreds". */
function plural(words: string): string {
  return words.replace(/[a-z]+$/, (last) =>
    last.endsWith("y") ? `${last.slice(0, -1)}ies` : `${last}s`,
  );
}

/** Decades and ordinals in `text` as English words; everything else is left as it is. */
export function spellNumbersEn(text: string): string {
  return text
    .replace(
      /(?<![\p{L}\p{N}])(1\d|20)(\d)0['’]?s(?![\p{L}\p{N}])/gu,
      (_all, c: string, d: string) => plural(yearEn(Number(c) * 100 + Number(d) * 10)),
    )
    .replace(/(?<![\p{L}\p{N}])['’]?([2-9])0['’]?s(?![\p{L}\p{N}])/gu, (_all, d: string) =>
      plural(under100(Number(d) * 10)),
    )
    .replace(/(?<![\p{L}\p{N}])(\d{1,3})(?:st|nd|rd|th)(?![\p{L}\p{N}])/gu, (all, n: string) =>
      Number(n) > 0 ? ordinalEn(Number(n)) : all,
    );
}
