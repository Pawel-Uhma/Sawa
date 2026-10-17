// Znaczniki miejsc, wariant I „Naklejka” (Paweł, 17.10, 18:05; docs/ui/propozycje/html/ikony-znaczniki-3.html):
// pełny glif w kolorze grupy z białą obwódką i cieniem, bez tła. 5 kształtów, po jednym na kolor grupy.
// Uruchom z katalogu repo: node docs/ui/ikony-mapy/znaczniki.mjs
// Zapisuje SVG do docs/ui/ikony-mapy/znaczniki/ i PNG 96 px do apps/web/public/map-icons/ (render w Chrome headless).
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SVG_DIR = "docs/ui/ikony-mapy/znaczniki";
const PNG_DIR = "apps/web/public/map-icons";
const PX = 96;

// Kolory jak w apps/web/src/features/map/lib/map-style.ts
const GRUPY = {
  architektura: {
    kolor: "#4f6d9a",
    g: "M4.5 21V8l7.5-5 7.5 5v13h-5.5v-5h-4v5Z M8 9.5h2.5v2.5H8Z M13.5 9.5H16v2.5h-2.5Z",
  },
  pamiec: { kolor: "#b5543c", g: "M10 4.5 12 2l2 2.5V16h-4Z M6.5 17h11v4h-11Z" },
  mural: {
    kolor: "#d4902a",
    g: "M12 2.5C9 7 5.8 10.6 5.8 14.6a6.2 6.2 0 0 0 12.4 0c0-4-3.2-7.6-6.2-12.1Z",
  },
  sacrum: { kolor: "#3f7d5a", g: "M10.4 2h3.2v5h5v3.2h-5V22h-3.2V10.2h-5V7h5Z" },
  miejsce: {
    kolor: "#8e4585",
    g: "M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9Z",
  },
};

const RODZAJE = {
  building: "architektura",
  street: "architektura",
  monument: "pamiec",
  plaque: "pamiec",
  mural: "mural",
  church: "sacrum",
  cemetery: "sacrum",
  site: "miejsce",
  event: "miejsce",
};

// Glif 24 px w polu 40: skala 1,12, obwódka 3,2 jednostki rysowana pod wypełnieniem
const svg = ({ kolor, g }) => `<svg xmlns="http://www.w3.org/2000/svg" width="${PX}" height="${PX}" viewBox="0 0 40 40">
  <defs><filter id="c" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.4" flood-color="#102B2A" flood-opacity=".3"/></filter></defs>
  <g filter="url(#c)"><g transform="translate(6.5 5.5) scale(1.12)"><path d="${g}" fill="${kolor}" fill-rule="evenodd" stroke="#fff" stroke-width="${(3.2 / 1.12).toFixed(3)}" stroke-linejoin="round" paint-order="stroke"/></g></g>
</svg>
`;

mkdirSync(SVG_DIR, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), "znaczniki-"));
for (const [rodzaj, grupa] of Object.entries(RODZAJE)) {
  const kod = svg(GRUPY[grupa]);
  writeFileSync(join(SVG_DIR, `${rodzaj}.svg`), kod);
  const html = join(tmp, `${rodzaj}.html`);
  writeFileSync(html, `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${kod}`);
  execFileSync(CHROME, [
    "--headless",
    "--hide-scrollbars",
    "--default-background-color=00000000",
    `--window-size=${PX},${PX}`,
    `--screenshot=${join(process.cwd(), PNG_DIR, `${rodzaj}.png`)}`,
    `file://${html}`,
  ], { stdio: "ignore" });
  console.log(rodzaj);
}
