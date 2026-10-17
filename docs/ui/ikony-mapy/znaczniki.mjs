// Znaczniki miejsc, wariant I „Naklejka” (Paweł, 17.10, 18:05; docs/ui/propozycje/html/ikony-znaczniki-3.html):
// pełny glif w kolorze grupy z białą obwódką i cieniem, bez tła. Od 18:30 jeden kształt na podrodzaj
// (`places.subkind`, PLACE_SUBKINDS w packages/shared), kolor według grupy.
// Uruchom z katalogu repo: node docs/ui/ikony-mapy/znaczniki.mjs
// Zapisuje SVG do docs/ui/ikony-mapy/znaczniki/, PNG 96 px do apps/web/public/map-icons/ (render w Chrome headless)
// i arkusz podglądu docs/ui/ikony-mapy/znaczniki/arkusz.html.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SVG_DIR = "docs/ui/ikony-mapy/znaczniki";
const PNG_DIR = "apps/web/public/map-icons";
const PX = 96;

// Kolory jak w apps/web/src/features/map/lib/map-style.ts (PLACE_GROUP_COLORS)
const GRUPY = {
  mieszkac: { kolor: "#4f6d9a", nazwa: "Mieszkać" },
  instytucje: { kolor: "#2b7c8c", nazwa: "Instytucje" },
  kultura: { kolor: "#d4902a", nazwa: "Kultura" },
  praca: { kolor: "#7a5a3c", nazwa: "Praca i transport" },
  pamiec: { kolor: "#b5543c", nazwa: "Wojna i pamięć" },
  sacrum: { kolor: "#8e4585", nazwa: "Sacrum" },
  natura: { kolor: "#3f7d5a", nazwa: "Natura i ruch" },
  inne: { kolor: "#6b7280", nazwa: "Inne" },
};

// Glify 24 × 24, fill-rule evenodd: zagnieżdżony kształt wycina otwór (okna, drzwi).
const ZNACZNIKI = {
  tenement: {
    grupa: "mieszkac",
    nazwa: "kamienica",
    g: "M5 21V6l2-3h10l2 3v15h-5v-4h-4v4Z M8 7.5h2v2.5H8Z M14 7.5h2v2.5h-2Z M8 12h2v2.5H8Z M14 12h2v2.5h-2Z",
  },
  building: {
    grupa: "mieszkac",
    nazwa: "budynek",
    g: "M4.5 21V8l7.5-5 7.5 5v13h-5.5v-5h-4v5Z M8 9.5h2.5v2.5H8Z M13.5 9.5H16v2.5h-2.5Z",
  },
  palace: {
    grupa: "mieszkac",
    nazwa: "pałac",
    g: "M1.5 21v-9h3.5V9.5L12 4l7 5.5V12h3.5v9Z M12 7.4a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z M4 14h2v3H4Z M18 14h2v3h-2Z M8 13h2v3H8Z M14 13h2v3h-2Z M10.6 16.5h2.8V21h-2.8Z",
  },
  manor: {
    grupa: "mieszkac",
    nazwa: "dwór, willa",
    g: "M1.5 12.5 12 5l10.5 7.5H20V21H4v-8.5Z M6.5 14.5h2.5V17H6.5Z M15 14.5h2.5V17H15Z M10.6 15h2.8v6h-2.8Z",
  },
  housing: {
    grupa: "mieszkac",
    nazwa: "blok, osiedle",
    g: "M6 21V2.5h12V21Z M8 4.5h3v2H8Z M13 4.5h3v2h-3Z M8 8.5h3v2H8Z M13 8.5h3v2h-3Z M8 12.5h3v2H8Z M13 12.5h3v2h-3Z M10.5 17h3v4h-3Z",
  },
  street: {
    grupa: "mieszkac",
    nazwa: "ulica, plac",
    g: "M9.5 2.5h5L20.5 21h-17Z M11.4 5h1.2l.2 3h-1.6Z M11.1 10h1.8l.3 3.8h-2.4Z M10.8 16h2.4l.3 4h-3Z",
  },
  school: {
    grupa: "instytucje",
    nazwa: "szkoła",
    g: "M16.5 2 22 7.5 9 20.5 2.5 21.5 3.5 15Z M5.2 15.8l3 3-1 1-3-3Z",
  },
  university: {
    grupa: "instytucje",
    nazwa: "uczelnia",
    g: "M12 3.5 1 9l11 5.5 8.5-4.25V15H22V9Z M5.5 12.6V17c0 1.8 2.9 3.5 6.5 3.5s6.5-1.7 6.5-3.5v-4.4L12 15.85Z",
  },
  hospital: {
    grupa: "instytucje",
    nazwa: "szpital",
    g: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z M10.2 6.5v3.7H6.5v3.6h3.7v3.7h3.6v-3.7h3.7v-3.6h-3.7V6.5Z",
  },
  office: {
    grupa: "instytucje",
    nazwa: "urząd, sąd",
    g: "M12 2 22 7.5V10H2V7.5Z M3.5 11.5h17V18h-17Z M6.5 12.8h1.8v4H6.5Z M11.1 12.8h1.8v4h-1.8Z M15.7 12.8h1.8v4h-1.8Z M2 19.5h20V22H2Z",
  },
  trade: {
    grupa: "instytucje",
    nazwa: "handel, hotel, bank",
    g: "M4.5 8.5h15L18.5 21h-13Z M8 8.5V7a4 4 0 0 1 8 0v1.5h-2V7a2 2 0 0 0-4 0v1.5Z",
  },
  museum: {
    grupa: "kultura",
    nazwa: "muzeum, galeria",
    g: "M2.5 3.5h19v17h-19Z M5 6v12h14V6Z M6.5 16.5l4-5.5 3 3.8 2-2.3 2 4Z M15.5 7.2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z",
  },
  theatre: {
    grupa: "kultura",
    nazwa: "teatr, scena",
    g: "M3.5 3h17v8a8.5 8.5 0 0 1-17 0Z M6.5 7.5h3.5v2H6.5Z M14 7.5h3.5v2H14Z M7.5 13h9a4.5 4.5 0 0 1-9 0Z",
  },
  cinema: {
    grupa: "kultura",
    nazwa: "kino",
    g: "M2.5 9.5h19v11h-19Z M2.5 7.4 19.6 2.6l.6 2.1L3 8.6Z M10 12v6l5-3Z",
  },
  library: {
    grupa: "kultura",
    nazwa: "biblioteka",
    g: "M2.5 20h19v2.5h-19Z M3.5 4h4v15h-4Z M8.5 6.5h4V19h-4Z M13.4 6.1 17 5l4 13.8-3.6 1Z",
  },
  mural: {
    grupa: "kultura",
    nazwa: "mural",
    g: "M12 2.5C9 7 5.8 10.6 5.8 14.6a6.2 6.2 0 0 0 12.4 0c0-4-3.2-7.6-6.2-12.1Z",
  },
  factory: {
    grupa: "praca",
    nazwa: "fabryka",
    g: "M1.5 21V10.5l5.5 3.5v-3.5l5.5 3.5v-3.5l4.5 3V2.5h4V21Z M4.5 16.5h2.5V19H4.5Z M10 16.5h2.5V19H10Z",
  },
  station: {
    grupa: "praca",
    nazwa: "dworzec, metro",
    g: "M7.5 2.5h9a3.5 3.5 0 0 1 3.5 3.5v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a3.5 3.5 0 0 1 3.5-3.5Z M6.5 5.5v5h11v-5Z M8 12.8a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z M16 12.8a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z M6.5 19h2.8l-1.5 3H5Z M14.7 19h2.8l1.5 3h-2.8Z",
  },
  bridge: {
    grupa: "praca",
    nazwa: "most",
    g: "M1 8h22v3.5h-2V20h-3.5v-2.5a5.5 5.5 0 0 0-11 0V20H3v-8.5H1Z",
  },
  monument: {
    grupa: "pamiec",
    nazwa: "pomnik",
    g: "M10 4.5 12 2l2 2.5V16h-4Z M6.5 17h11v4h-11Z",
  },
  plaque: {
    grupa: "pamiec",
    nazwa: "tablica",
    g: "M3.5 4.5h17v15h-17Z M7 8h10v1.8H7Z M7 11.5h10v1.8H7Z M7 15h6v1.8H7Z",
  },
  fortress: {
    grupa: "pamiec",
    nazwa: "fort, koszary",
    g: "M3 21V6h3.5v3h3V6h5v3h3V6H21v15h-6v-4.5a3 3 0 0 0-6 0V21Z",
  },
  prison: {
    grupa: "pamiec",
    nazwa: "więzienie, getto",
    g: "M3.5 2.5h17v19h-17Z M6.5 5.5h2v13h-2Z M11 5.5h2v13h-2Z M15.5 5.5h2v13h-2Z",
  },
  event: {
    grupa: "pamiec",
    nazwa: "wydarzenie",
    g: "M4.5 2h2.5v20H4.5Z M8.5 3.5H21l-3 4.5 3 4.5H8.5Z",
  },
  church: {
    grupa: "sacrum",
    nazwa: "kościół",
    g: "M10.4 2h3.2v5h5v3.2h-5V22h-3.2V10.2h-5V7h5Z",
  },
  chapel: {
    grupa: "sacrum",
    nazwa: "kapliczka",
    g: "M12 2 19 8h-2.5v7h-9V8H5Z M11.2 9.5h1.6v3.5h-1.6Z M10.8 16.5h2.4V20h-2.4Z M7 20.5h10V22H7Z",
  },
  orthodox: {
    grupa: "sacrum",
    nazwa: "cerkiew",
    g: "M11.2 1.5h1.6v1.5h2.2v1.5h-2.2v2.2h-1.6V4.5H9V3h2.2Z M12 7.5c3.2 2.3 5.5 4.2 5.5 7A2.5 2.5 0 0 1 15 17H9a2.5 2.5 0 0 1-2.5-2.5c0-2.8 2.3-4.7 5.5-7Z M7.5 18h9v4h-9Z",
  },
  synagogue: {
    grupa: "sacrum",
    nazwa: "synagoga",
    g: "M12 2 21 17.5H3Z M12 22 3 6.5h18Z",
  },
  cemetery: {
    grupa: "sacrum",
    nazwa: "cmentarz",
    g: "M5.5 20V10a6.5 6.5 0 0 1 13 0v10Z M11.2 7.5h1.6v2.2H15v1.6h-2.2V17h-1.6v-5.7H9V9.7h2.2Z M3.5 20.5h17V22h-17Z",
  },
  park: {
    grupa: "natura",
    nazwa: "park, skwer",
    g: "M12 2a6 6 0 0 1 5.7 7.9A4.6 4.6 0 0 1 15.2 18H13.2v4h-2.4v-4H8.8A4.6 4.6 0 0 1 6.3 9.9 6 6 0 0 1 12 2Z",
  },
  garden: {
    grupa: "natura",
    nazwa: "ogród",
    g: "M6.5 3l3 2.8L12 2.5l2.5 3.3 3-2.8v6a5.5 5.5 0 0 1-11 0Z M11.2 14.5h1.6V22h-1.6Z M11.2 20C8.4 20 6.2 18.5 5.6 15.8c2.8 0 5 1.5 5.6 4.2Z M12.8 20c2.8 0 5-1.5 5.6-4.2-2.8 0-5 1.5-5.6 4.2Z",
  },
  water: {
    grupa: "natura",
    nazwa: "woda",
    g: "M1.5 6.5c2.6 0 2.6-2 5.25-2S9.4 6.5 12 6.5s2.6-2 5.25-2 2.6 2 5.25 2v3c-2.6 0-2.6-2-5.25-2S14.6 9.5 12 9.5 9.4 7.5 6.75 7.5 4.1 9.5 1.5 9.5Z M1.5 12.5c2.6 0 2.6-2 5.25-2s2.65 2 5.25 2 2.6-2 5.25-2 2.6 2 5.25 2v3c-2.6 0-2.6-2-5.25-2s-2.65 2-5.25 2-2.6-2-5.25-2-2.65 2-5.25 2Z M1.5 18.5c2.6 0 2.6-2 5.25-2s2.65 2 5.25 2 2.6-2 5.25-2 2.6 2 5.25 2v3c-2.6 0-2.6-2-5.25-2s-2.65 2-5.25 2-2.6-2-5.25-2-2.65 2-5.25 2Z",
  },
  pitch: {
    grupa: "natura",
    nazwa: "boisko",
    g: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z M12 7.5l3.6 2.6-1.4 4.2H9.8l-1.4-4.2Z",
  },
  stadium: {
    grupa: "natura",
    nazwa: "stadion, hala, basen",
    g: "M12 4.5c5.8 0 10.5 2.7 10.5 6.3v3.4c0 3.6-4.7 6.3-10.5 6.3S1.5 17.8 1.5 14.2v-3.4C1.5 7.2 6.2 4.5 12 4.5Z M12 7.7c-4.1 0-7.2 1.5-7.2 3.4s3.1 3.4 7.2 3.4 7.2-1.5 7.2-3.4-3.1-3.4-7.2-3.4Z",
  },
  site: {
    grupa: "inne",
    nazwa: "miejsce",
    g: "M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9Z",
  },
};

// Glif 24 px w polu 40: skala 1,12, obwódka 3,2 jednostki rysowana pod wypełnieniem
const svg = ({ kolor, g }) => `<svg xmlns="http://www.w3.org/2000/svg" width="${PX}" height="${PX}" viewBox="0 0 40 40">
  <defs><filter id="c" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.4" flood-color="#102B2A" flood-opacity=".3"/></filter></defs>
  <g filter="url(#c)"><g transform="translate(6.5 5.5) scale(1.12)"><path d="${g}" fill="${kolor}" fill-rule="evenodd" stroke="#fff" stroke-width="${(3.2 / 1.12).toFixed(3)}" stroke-linejoin="round" paint-order="stroke"/></g></g>
</svg>
`;

mkdirSync(SVG_DIR, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), "znaczniki-"));
const kafle = [];
for (const [rodzaj, { grupa, nazwa, g }] of Object.entries(ZNACZNIKI)) {
  const kod = svg({ kolor: GRUPY[grupa].kolor, g });
  writeFileSync(join(SVG_DIR, `${rodzaj}.svg`), kod);
  kafle.push({ grupa, nazwa, rodzaj, kod });
  if (process.argv.includes("--bez-png")) continue;
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
}

// Arkusz: każda grupa w wierszu, na jasnym i na ciemnym tle. Id filtra cienia unikalne na stronie.
const naArkusz = (k, i) =>
  k.kod.replace('width="96" height="96"', 'width="48" height="48"').replaceAll('"c"', `"c${i}"`).replace("url(#c)", `url(#c${i})`);
const wiersze = (od) =>
  Object.entries(GRUPY)
    .map(([klucz, { kolor, nazwa }]) => {
      const w = kafle.filter((k) => k.grupa === klucz);
      return `<section><h2 style="color:${kolor}">${nazwa}</h2><div class="r">${w
        .map((k) => `<figure>${naArkusz(k, od + kafle.indexOf(k))}<figcaption>${k.nazwa}<code>${k.rodzaj}</code></figcaption></figure>`)
        .join("")}</div></section>`;
    })
    .join("");
writeFileSync(
  join(SVG_DIR, "arkusz.html"),
  `<!doctype html><meta charset="utf-8"><title>Znaczniki miejsc</title>
<style>body{font:14px system-ui;margin:24px;background:#f4f1ea;color:#1f2a29}h1{font-size:18px}h2{font-size:14px;margin:14px 0 6px}
.r{display:flex;flex-wrap:wrap;gap:8px}figure{margin:0;width:104px;text-align:center;padding:8px 0;border-radius:12px;background:#fff}
figcaption{font-size:12px}code{display:block;color:#6b7280;font-size:11px}
.ciemny{background:#0e1615;color:#e6efed;padding:4px 16px 16px;margin-top:24px;border-radius:16px}.ciemny figure{background:#1b2827}</style>
<h1>Znaczniki miejsc: ${kafle.length}</h1>${wiersze(0)}<div class="ciemny">${wiersze(1000)}</div>`,
);
console.log(`${kafle.length} znaczników, arkusz w ${SVG_DIR}/arkusz.html`);
