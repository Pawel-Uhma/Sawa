/**
 * Fakty z warszawa1939.pl przychodzą z markdownem źródła: „**BUDOWA:**: ok. 1902…”,
 * „_Uwaga: …_”, „\- **około 1900**”, a na końcu czasem „* * * Na temat tego budynku…”.
 * Zamieniamy to na fragmenty do wyrenderowania jako <strong>/<em>/tekst, bez HTML z danych.
 */

export type FactSegment = { text: string; strong?: true; em?: true };

/** Źródło w nawiasie na końcu („(Wikipedia pl: Kercelak)”); w karcie źródła są osobno. */
const TRAILING_SOURCE = /\s*\([^()]*\)\s*$/;
/** Separator „* * *” i formułka serwisu za nim („…przejdź do formularza…”). */
const BOILERPLATE = /\s*\* \* \*[\s\S]*$/;
/** Etykieta z dodatkowym dwukropkiem po pogrubieniu: „**BUDOWA:**:”. */
const LABEL_COLON = /\*\*([^*]+?):\*\*\s*:/g;
const TOKEN =
  /\\([\\`*_{}[\]()#+\-.!>])|\*\*(.+?)\*\*|(?<![\p{L}\p{N}_])_(.+?)_(?![\p{L}\p{N}_])/gu;

const literal = (char: string) => (char === "-" ? "–" : char);

/** Tekst bez znaczników, np. do treści wewnątrz pogrubienia albo do klucza listy. */
function plain(text: string): string {
  return text.replace(TOKEN, (_m, escaped?: string, strong?: string, em?: string) =>
    escaped !== undefined ? literal(escaped) : plain(strong ?? em ?? ""),
  );
}

/** Etykieta wersalikami („BUDOWA:”) brzmi jak krzyk; w karcie piszemy „Budowa:”. */
function softenLabel(text: string): string {
  if (text.length < 3 || text !== text.toLocaleUpperCase("pl") || !/\p{L}/u.test(text)) {
    return text;
  }
  const lower = text.toLocaleLowerCase("pl");
  return lower.charAt(0).toLocaleUpperCase("pl") + lower.slice(1);
}

export function factSegments(fact: string): FactSegment[] {
  const source = fact
    .replace(BOILERPLATE, "")
    .replace(TRAILING_SOURCE, "")
    .replace(LABEL_COLON, "**$1:**")
    .trim();

  const segments: FactSegment[] = [];
  const push = (segment: FactSegment) => {
    if (!segment.text) return;
    const last = segments.at(-1);
    if (last && !last.strong && !last.em && !segment.strong && !segment.em) {
      last.text += segment.text;
    } else {
      segments.push(segment);
    }
  };

  let cursor = 0;
  for (const match of source.matchAll(TOKEN)) {
    const [whole, escaped, strong, em] = match;
    push({ text: source.slice(cursor, match.index) });
    if (escaped !== undefined) push({ text: literal(escaped) });
    else if (strong !== undefined) {
      const text = plain(strong);
      push({ text: match.index === 0 ? softenLabel(text) : text, strong: true });
    } else push({ text: plain(em ?? ""), em: true });
    cursor = match.index + whole.length;
  }
  push({ text: source.slice(cursor) });
  return segments;
}

/** Fakt jako czysty tekst, bez znaczników markdown. */
export function factPlainText(fact: string): string {
  return factSegments(fact)
    .map((segment) => segment.text)
    .join("");
}
