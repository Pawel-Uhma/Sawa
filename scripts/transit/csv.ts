/** Splits one CSV line (RFC 4180 quoting, no embedded newlines; true for the Warsaw GTFS). */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      out.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out;
}

/** Rows of a whole CSV file as records keyed by header. */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const header = parseCsvLine(lines[0] ?? "");
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""]));
  });
}

/** Calls `onRow` for every row of a CSV fed in chunks; returns `push(chunk, final)`. */
export function csvStream(onRow: (row: Record<string, string>) => void) {
  const decoder = new TextDecoder();
  let header: string[] | null = null;
  let rest = "";
  const handle = (line: string) => {
    if (line.length === 0) return;
    const cells = parseCsvLine(line);
    if (!header) {
      header = cells;
      return;
    }
    const h = header;
    onRow(Object.fromEntries(h.map((name, i) => [name, cells[i] ?? ""])));
  };
  return (chunk: Uint8Array, final: boolean) => {
    const lines = (rest + decoder.decode(chunk, { stream: !final })).split(/\r?\n/);
    rest = final ? "" : (lines.pop() ?? "");
    for (const line of lines) handle(line);
  };
}

/** "25:10:00" → seconds since midnight of the service day (GTFS allows hours ≥ 24). */
export function gtfsTimeToSec(time: string): number {
  const [h, m, s] = time.split(":").map(Number);
  return (h ?? 0) * 3600 + (m ?? 0) * 60 + (s ?? 0);
}
